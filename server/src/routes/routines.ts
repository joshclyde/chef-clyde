import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";

import {
  getRoutinesDir,
  getSoftDeleteDir,
  readAllRoutines,
  readRoutine,
  writeRoutine,
} from "../db/routines";
import type { Completion,FrequencyUnit } from "../types/chore";
import type { DayOfWeek, TimeOfDay } from "../types/hobby";
import type { Routine, RoutineOccurrence } from "../types/routine";

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
  "night",
  "any",
];

type ValidatedRoutine = {
  label: string;
  timeOfDay: TimeOfDay;
  typicalTimeMinutes?: number;
  occurrence: RoutineOccurrence;
};

/**
 * Validate a routine's occurrence. Routines only ever recur, so this accepts
 * just "weekly" and "frequency" — "event" and "oneoff" are rejected like any
 * other invalid kind.
 */
function validateOccurrence(
  raw: unknown,
): { occurrence: RoutineOccurrence } | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "occurrence is required" };
  }
  const o = raw as Record<string, unknown>;

  switch (o.kind) {
    case "weekly": {
      const days = o.days;
      if (
        !Array.isArray(days) ||
        days.length === 0 ||
        !days.every((d) => DAYS_OF_WEEK.includes(d as DayOfWeek))
      ) {
        return { error: "weekly occurrence needs a non-empty days array" };
      }
      // De-dupe + order days canonically (Sun→Sat) so storage is stable.
      const uniqueDays = DAYS_OF_WEEK.filter((d) =>
        (days as DayOfWeek[]).includes(d),
      );
      return { occurrence: { kind: "weekly", days: uniqueDays } };
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
    default:
      return { error: "occurrence.kind must be weekly or frequency" };
  }
}

/** Validate the user-editable fields shared by create + update. */
function validateRoutineInput(
  body: unknown,
): { fields: ValidatedRoutine } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "request body is required" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.label !== "string" || b.label.trim() === "") {
    return { error: "label is required" };
  }
  if (
    typeof b.timeOfDay !== "string" ||
    !TIMES_OF_DAY.includes(b.timeOfDay as TimeOfDay)
  ) {
    return { error: "timeOfDay is invalid" };
  }
  const time = b.typicalTimeMinutes;
  if (
    time != null &&
    (typeof time !== "number" || !Number.isFinite(time) || time < 0)
  ) {
    return { error: "typicalTimeMinutes must be a non-negative number" };
  }
  const occ = validateOccurrence(b.occurrence);
  if ("error" in occ) return { error: occ.error };

  return {
    fields: {
      label: b.label.trim(),
      timeOfDay: b.timeOfDay as TimeOfDay,
      ...(typeof time === "number" ? { typicalTimeMinutes: time } : {}),
      occurrence: occ.occurrence,
    },
  };
}

router.get("/", (_req, res) => {
  res.json({ routines: readAllRoutines() });
});

router.post("/", (req, res) => {
  const result = validateRoutineInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const now = new Date().toISOString();
  const routine: Routine = {
    id: crypto.randomUUID(),
    label: result.fields.label,
    timeOfDay: result.fields.timeOfDay,
    ...(result.fields.typicalTimeMinutes != null
      ? { typicalTimeMinutes: result.fields.typicalTimeMinutes }
      : {}),
    occurrence: result.fields.occurrence,
    completions: [],
    createdAt: now,
    updatedAt: now,
  };
  writeRoutine(routine);
  res.status(201).json({ routine });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const routine = readRoutine(id);
  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  const result = validateRoutineInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  // The client never sends completions, so keep the stored history on update.
  const updated: Routine = {
    ...routine,
    label: result.fields.label,
    timeOfDay: result.fields.timeOfDay,
    typicalTimeMinutes: result.fields.typicalTimeMinutes,
    occurrence: result.fields.occurrence,
    updatedAt: new Date().toISOString(),
  };
  if (updated.typicalTimeMinutes === undefined) delete updated.typicalTimeMinutes;
  writeRoutine(updated);
  res.status(200).json({ routine: updated });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getRoutinesDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

router.post("/:id/completions", (req, res) => {
  const { id } = req.params;
  const { performedAt } = req.body as { performedAt?: unknown };
  if (performedAt !== undefined && typeof performedAt !== "string") {
    res.status(400).json({ error: "performedAt must be an ISO date string" });
    return;
  }
  const routine = readRoutine(id);
  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  const when =
    typeof performedAt === "string" ? performedAt : new Date().toISOString();
  if (Number.isNaN(new Date(when).getTime())) {
    res.status(400).json({ error: "performedAt is not a valid date" });
    return;
  }
  const completion: Completion = { id: crypto.randomUUID(), performedAt: when };
  routine.completions = [...routine.completions, completion];
  routine.updatedAt = new Date().toISOString();
  writeRoutine(routine);
  res.status(201).json({ routine });
});

router.delete("/:id/completions/:completionId", (req, res) => {
  const { id, completionId } = req.params;
  const routine = readRoutine(id);
  if (!routine) {
    res.status(404).json({ error: "Routine not found" });
    return;
  }
  const before = routine.completions.length;
  routine.completions = routine.completions.filter((c) => c.id !== completionId);
  if (routine.completions.length === before) {
    res.status(404).json({ error: "Completion not found" });
    return;
  }
  routine.updatedAt = new Date().toISOString();
  writeRoutine(routine);
  res.status(200).json({ routine });
});

export default router;
