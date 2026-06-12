import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import type { Schedule, ScheduleTask, TaskStatus } from "../types/schedule";
import type { Completion } from "../types/chore";
import {
  getSchedulesDir,
  getSoftDeleteDir,
  readAllSchedules,
  readSchedule,
  writeSchedule,
} from "../db/schedules";
import { readAllChores, readChore, writeChore } from "../db/chores";
import { generateScheduleResponse } from "../services/schedule";
import { parseScheduleTasks } from "../services/scheduleParser";

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MOCK_SCHEDULE =
  "Mocked daily schedule.\n\n" +
  "8:00–8:30 — Morning coffee and planning\n" +
  "9:00–9:45 — Clean the shower (overdue)\n" +
  "12:00–13:00 — Lunch\n" +
  "16:00–16:05 — Scoop attic litter (due now)\n" +
  "18:00–19:00 — Dinner";

router.get("/", (_req, res) => {
  res.json({ schedules: readAllSchedules() });
});

router.post("/generate", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (process.env.MOCK_AI === "true") {
    res.json({ content: MOCK_SCHEDULE });
    return;
  }

  try {
    const content = await generateScheduleResponse(messages);
    res.json({ content });
  } catch (error) {
    console.error("Schedule generation error:", error);
    res.status(500).json({ error: "Failed to generate schedule" });
  }
});

router.post("/", (req, res) => {
  const { date, content } = req.body as { date?: unknown; content?: unknown };

  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const now = new Date().toISOString();

  // One schedule per calendar date: update the existing day if present.
  const existing = readAllSchedules().find((s) => s.date === date);
  if (existing) {
    const updated: Schedule = {
      ...existing,
      content: content.trim(),
      updatedAt: now,
    };
    writeSchedule(updated);
    res.status(200).json({ schedule: updated });
    return;
  }

  const schedule: Schedule = {
    id: crypto.randomUUID(),
    date,
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
  };
  writeSchedule(schedule);
  res.status(201).json({ schedule });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { date, content } = req.body as { date?: unknown; content?: unknown };

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const trimmed = content.trim();
  const updated: Schedule = {
    ...schedule,
    date,
    content: trimmed,
    updatedAt: new Date().toISOString(),
  };
  // The parsed tasks were derived from the old text — drop them when the
  // content changes so a stale task list can't linger. The user re-parses.
  if (trimmed !== schedule.content) delete updated.tasks;
  writeSchedule(updated);
  res.status(200).json({ schedule: updated });
});

// Parse a saved schedule's free text into a structured, ordered task list and
// persist it onto the schedule. Mirrors the recipe-extraction route.
router.post("/:id/parse", async (req, res) => {
  const { id } = req.params;
  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const result = await parseScheduleTasks(schedule.content, readAllChores());
  if ("error" in result) {
    const status = result.error === "No tasks found in this schedule" ? 422 : 500;
    res.status(status).json({ error: result.error });
    return;
  }

  const updated: Schedule = {
    ...schedule,
    tasks: result.tasks.map((task) => ({
      ...task,
      id: crypto.randomUUID(),
      status: "pending" as const,
    })),
    updatedAt: new Date().toISOString(),
  };
  writeSchedule(updated);
  res.status(200).json({ schedule: updated });
});

const TASK_STATUSES: TaskStatus[] = [
  "pending",
  "completed",
  "future",
  "wontDo",
];

/**
 * Remove the chore completion this task previously logged. Best-effort: the
 * chore or completion may have been deleted from the Chores page in the
 * meantime, so a miss is not an error. Mutates the task; caller persists the
 * schedule.
 */
function removeLinkedCompletion(task: ScheduleTask): void {
  const completionId = task.choreCompletionId;
  if (!completionId) return;
  const chore = task.choreId ? readChore(task.choreId) : null;
  if (chore) {
    const remaining = chore.completions.filter((c) => c.id !== completionId);
    if (remaining.length !== chore.completions.length) {
      chore.completions = remaining;
      chore.updatedAt = new Date().toISOString();
      writeChore(chore);
    }
  }
  delete task.choreCompletionId;
}

/**
 * Log a completion on the task's linked chore and remember its id so
 * unchecking can undo it. If the chore was deleted since linking, drop the
 * stale link instead of failing the task update.
 */
function logLinkedCompletion(task: ScheduleTask): void {
  if (!task.choreId || task.choreCompletionId) return;
  const chore = readChore(task.choreId);
  if (!chore) {
    delete task.choreId;
    return;
  }
  const completion: Completion = {
    id: crypto.randomUUID(),
    performedAt: new Date().toISOString(),
  };
  chore.completions = [...chore.completions, completion];
  chore.updatedAt = new Date().toISOString();
  writeChore(chore);
  task.choreCompletionId = completion.id;
}

// Update a single task's status, notes, and/or chore link. All fields are
// optional, but at least one must be present. `choreId: null` clears the link.
router.patch("/:id/tasks/:taskId", (req, res) => {
  const { id, taskId } = req.params;
  const { status, notes, choreId } = req.body as {
    status?: unknown;
    notes?: unknown;
    choreId?: unknown;
  };

  if (status !== undefined && !TASK_STATUSES.includes(status as TaskStatus)) {
    res.status(400).json({
      error: `status must be one of: ${TASK_STATUSES.join(", ")}`,
    });
    return;
  }
  if (notes !== undefined && typeof notes !== "string") {
    res.status(400).json({ error: "notes must be a string" });
    return;
  }
  if (choreId !== undefined && choreId !== null && typeof choreId !== "string") {
    res.status(400).json({ error: "choreId must be a string or null" });
    return;
  }
  if (status === undefined && notes === undefined && choreId === undefined) {
    res.status(400).json({ error: "status, notes, or choreId is required" });
    return;
  }

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const task = schedule.tasks?.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (typeof choreId === "string" && !readChore(choreId)) {
    res.status(400).json({ error: "Chore not found" });
    return;
  }

  if (notes !== undefined) task.notes = notes as string;

  if (choreId !== undefined) {
    const next = choreId === null ? undefined : (choreId as string);
    if (task.choreId !== next) {
      // Re-linking: undo the completion the old link created before switching.
      removeLinkedCompletion(task);
      if (next === undefined) delete task.choreId;
      else task.choreId = next;
    }
  }

  if (status !== undefined) task.status = status as TaskStatus;

  // Invariant: a completed linked task owns exactly one chore completion;
  // anything else owns none.
  if (task.status === "completed") logLinkedCompletion(task);
  else removeLinkedCompletion(task);

  schedule.updatedAt = new Date().toISOString();
  writeSchedule(schedule);
  res.status(200).json({ schedule });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getSchedulesDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

export default router;
