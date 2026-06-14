import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import type { FrequencyUnit, Completion } from "../types/chore";
import type {
  DayOfWeek,
  Hobby,
  HobbyTask,
  Occurrence,
  TimeOfDay,
} from "../types/hobby";
import {
  getHobbiesDir,
  getSoftDeleteDir,
  readAllHobbies,
  readHobby,
  writeHobby,
} from "../db/hobbies";

const router = express.Router();

const FREQUENCY_UNITS: FrequencyUnit[] = ["days", "weeks", "months"];
const DAYS_OF_WEEK: DayOfWeek[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
const TIMES_OF_DAY: TimeOfDay[] = [
  "morning",
  "midday",
  "afternoon",
  "evening",
  "any",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

type ValidatedTask = Omit<HobbyTask, "completions">;

/**
 * Validate a single task's occurrence by kind. Returns the cleaned occurrence
 * or an error message describing the first problem found.
 */
function validateOccurrence(
  raw: unknown,
): { occurrence: Occurrence } | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "task.occurrence is required" };
  }
  const o = raw as Record<string, unknown>;

  switch (o.kind) {
    case "event": {
      if (typeof o.date !== "string" || !DATE_PATTERN.test(o.date)) {
        return { error: "event occurrence needs a date (YYYY-MM-DD)" };
      }
      const start = o.startTime;
      const end = o.endTime;
      if (start != null && (typeof start !== "string" || !TIME_PATTERN.test(start))) {
        return { error: "event startTime must be HH:MM" };
      }
      if (end != null && (typeof end !== "string" || !TIME_PATTERN.test(end))) {
        return { error: "event endTime must be HH:MM" };
      }
      if (typeof start === "string" && typeof end === "string" && end <= start) {
        return { error: "event endTime must be after startTime" };
      }
      const occurrence: Occurrence = { kind: "event", date: o.date };
      if (typeof start === "string") occurrence.startTime = start;
      if (typeof end === "string") occurrence.endTime = end;
      return { occurrence };
    }
    case "weekly": {
      const days = o.days;
      if (
        !Array.isArray(days) ||
        days.length === 0 ||
        !days.every((d) => DAYS_OF_WEEK.includes(d as DayOfWeek))
      ) {
        return { error: "weekly occurrence needs a non-empty days array" };
      }
      const timeOfDay = o.timeOfDay;
      if (
        timeOfDay != null &&
        !TIMES_OF_DAY.includes(timeOfDay as TimeOfDay)
      ) {
        return { error: "weekly timeOfDay is invalid" };
      }
      // De-dupe + order days canonically (Sun→Sat) so storage is stable.
      const uniqueDays = DAYS_OF_WEEK.filter((d) =>
        (days as DayOfWeek[]).includes(d),
      );
      const occurrence: Occurrence = { kind: "weekly", days: uniqueDays };
      if (typeof timeOfDay === "string") {
        occurrence.timeOfDay = timeOfDay as TimeOfDay;
      }
      return { occurrence };
    }
    case "frequency": {
      const value = o.value;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return { error: "frequency value must be a positive number" };
      }
      if (
        typeof o.unit !== "string" ||
        !FREQUENCY_UNITS.includes(o.unit as FrequencyUnit)
      ) {
        return { error: "frequency unit must be days, weeks, or months" };
      }
      return {
        occurrence: {
          kind: "frequency",
          value,
          unit: o.unit as FrequencyUnit,
        },
      };
    }
    case "oneoff":
      return { occurrence: { kind: "oneoff" } };
    default:
      return { error: "task.occurrence.kind is invalid" };
  }
}

function validateTask(
  raw: unknown,
): { task: ValidatedTask } | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "each task must be an object" };
  }
  const t = raw as Record<string, unknown>;

  if (typeof t.label !== "string" || t.label.trim() === "") {
    return { error: "task.label is required" };
  }
  const time = t.typicalTimeMinutes;
  if (
    time != null &&
    (typeof time !== "number" || !Number.isFinite(time) || time < 0)
  ) {
    return { error: "task.typicalTimeMinutes must be a non-negative number" };
  }
  const occ = validateOccurrence(t.occurrence);
  if ("error" in occ) return { error: occ.error };

  // Preserve an existing id so PUT can match tasks and retain their history.
  const id = typeof t.id === "string" && t.id ? t.id : crypto.randomUUID();
  return {
    task: {
      id,
      label: t.label.trim(),
      ...(typeof time === "number" ? { typicalTimeMinutes: time } : {}),
      occurrence: occ.occurrence,
    },
  };
}

type ValidatedHobby = {
  name: string;
  notes?: string;
  tasks: ValidatedTask[];
};

/** Validate the user-editable fields shared by create + update. */
function validateHobbyInput(
  body: unknown,
): { fields: ValidatedHobby } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "request body is required" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || b.name.trim() === "") {
    return { error: "name is required" };
  }
  if (b.notes != null && typeof b.notes !== "string") {
    return { error: "notes must be a string" };
  }
  const rawTasks = b.tasks ?? [];
  if (!Array.isArray(rawTasks)) {
    return { error: "tasks must be an array" };
  }

  const tasks: ValidatedTask[] = [];
  for (const raw of rawTasks) {
    const result = validateTask(raw);
    if ("error" in result) return { error: result.error };
    tasks.push(result.task);
  }

  const cleanNotes = typeof b.notes === "string" ? b.notes.trim() : "";
  return {
    fields: {
      name: b.name.trim(),
      ...(cleanNotes === "" ? {} : { notes: cleanNotes }),
      tasks,
    },
  };
}

/**
 * Merge validated tasks with an existing hobby's stored tasks, preserving each
 * task's server-owned completion history (matched by id). New tasks start with
 * an empty completions array. The client never sends completions, so this is
 * what keeps a wholesale hobby update from dropping logged sessions.
 */
function withPreservedCompletions(
  tasks: ValidatedTask[],
  existing: Hobby | null,
): HobbyTask[] {
  const byId = new Map(
    (existing?.tasks ?? []).map((t) => [t.id, t.completions]),
  );
  return tasks.map((t) => ({ ...t, completions: byId.get(t.id) ?? [] }));
}

router.get("/", (_req, res) => {
  res.json({ hobbies: readAllHobbies() });
});

router.post("/", (req, res) => {
  const result = validateHobbyInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const now = new Date().toISOString();
  const hobby: Hobby = {
    id: crypto.randomUUID(),
    name: result.fields.name,
    ...(result.fields.notes ? { notes: result.fields.notes } : {}),
    tasks: withPreservedCompletions(result.fields.tasks, null),
    createdAt: now,
    updatedAt: now,
  };
  writeHobby(hobby);
  res.status(201).json({ hobby });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const hobby = readHobby(id);
  if (!hobby) {
    res.status(404).json({ error: "Hobby not found" });
    return;
  }
  const result = validateHobbyInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const updated: Hobby = {
    ...hobby,
    name: result.fields.name,
    notes: result.fields.notes,
    tasks: withPreservedCompletions(result.fields.tasks, hobby),
    updatedAt: new Date().toISOString(),
  };
  if (updated.notes === undefined) delete updated.notes;
  writeHobby(updated);
  res.status(200).json({ hobby: updated });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getHobbiesDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Hobby not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

router.post("/:id/tasks/:taskId/completions", (req, res) => {
  const { id, taskId } = req.params;
  const { performedAt } = req.body as { performedAt?: unknown };
  if (performedAt !== undefined && typeof performedAt !== "string") {
    res.status(400).json({ error: "performedAt must be an ISO date string" });
    return;
  }
  const hobby = readHobby(id);
  if (!hobby) {
    res.status(404).json({ error: "Hobby not found" });
    return;
  }
  const task = hobby.tasks.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const when =
    typeof performedAt === "string" ? performedAt : new Date().toISOString();
  if (Number.isNaN(new Date(when).getTime())) {
    res.status(400).json({ error: "performedAt is not a valid date" });
    return;
  }
  const completion: Completion = { id: crypto.randomUUID(), performedAt: when };
  task.completions = [...task.completions, completion];
  hobby.updatedAt = new Date().toISOString();
  writeHobby(hobby);
  res.status(201).json({ hobby });
});

router.delete("/:id/tasks/:taskId/completions/:completionId", (req, res) => {
  const { id, taskId, completionId } = req.params;
  const hobby = readHobby(id);
  if (!hobby) {
    res.status(404).json({ error: "Hobby not found" });
    return;
  }
  const task = hobby.tasks.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const before = task.completions.length;
  task.completions = task.completions.filter((c) => c.id !== completionId);
  if (task.completions.length === before) {
    res.status(404).json({ error: "Completion not found" });
    return;
  }
  hobby.updatedAt = new Date().toISOString();
  writeHobby(hobby);
  res.status(200).json({ hobby });
});

export default router;
