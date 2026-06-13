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
import {
  buildSchedulePrompt,
  generateScheduleTasks,
} from "../services/schedule";

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

router.get("/", (_req, res) => {
  res.json({ schedules: readAllSchedules() });
});

// Preview the exact prompt the generator will send, without calling the model,
// so the UI can show the user everything that feeds the task list.
router.post("/preview-prompt", (req, res) => {
  const { date, dayContext } = req.body as {
    date?: unknown;
    dayContext?: unknown;
  };
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  if (typeof dayContext !== "string") {
    res.status(400).json({ error: "dayContext must be a string" });
    return;
  }

  const { system, userMessage } = buildSchedulePrompt({
    date,
    dayContext,
    chores: readAllChores(),
  });
  res.json({ prompt: `${system}\n\n────────\nRequest: ${userMessage}` });
});

router.post("/", (req, res) => {
  const { date, dayContext } = req.body as {
    date?: unknown;
    dayContext?: unknown;
  };

  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  // dayContext is the user's one-off notes for the day and may be empty.
  if (typeof dayContext !== "string") {
    res.status(400).json({ error: "dayContext must be a string" });
    return;
  }

  const now = new Date().toISOString();

  // One schedule per calendar date: update the existing day if present.
  const existing = readAllSchedules().find((s) => s.date === date);
  if (existing) {
    const updated: Schedule = {
      ...existing,
      dayContext: dayContext.trim(),
      updatedAt: now,
    };
    writeSchedule(updated);
    res.status(200).json({ schedule: updated });
    return;
  }

  const schedule: Schedule = {
    id: crypto.randomUUID(),
    date,
    dayContext: dayContext.trim(),
    createdAt: now,
    updatedAt: now,
  };
  writeSchedule(schedule);
  res.status(201).json({ schedule });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { date, dayContext } = req.body as {
    date?: unknown;
    dayContext?: unknown;
  };

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  if (typeof dayContext !== "string") {
    res.status(400).json({ error: "dayContext must be a string" });
    return;
  }

  // Editing day-notes no longer derives tasks, so an existing task list stays
  // put until the user explicitly re-generates.
  const updated: Schedule = {
    ...schedule,
    date,
    dayContext: dayContext.trim(),
    updatedAt: new Date().toISOString(),
  };
  writeSchedule(updated);
  res.status(200).json({ schedule: updated });
});

// Generate the day's structured task list from all of its inputs (day notes,
// chores, standing instructions, recent history) in a single model call and
// persist it onto the schedule.
router.post("/:id/generate", async (req, res) => {
  const { id } = req.params;
  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const result = await generateScheduleTasks({
    date: schedule.date,
    dayContext: schedule.dayContext,
    chores: readAllChores(),
  });
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
