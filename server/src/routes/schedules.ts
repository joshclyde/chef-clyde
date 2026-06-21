import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";

import {
  readAllScheduleItems,
  readScheduleItem,
  writeScheduleItem,
} from "../db/scheduleItems";
import {
  getSchedulesDir,
  getSoftDeleteDir,
  readAllSchedules,
  readSchedule,
  writeSchedule,
} from "../db/schedules";
import { resolveAiOptions } from "../services/aiOptions";
import {
  buildSchedulePrompt,
  editScheduleTasks,
  generateScheduleTasks,
} from "../services/schedule";
import type { Schedule, ScheduleTask, TaskStatus } from "../types/schedule";
import type { Completion } from "../types/scheduleItem";

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/; // 24h "HH:MM"

/**
 * Keep a day's tasks chronological by start time. The daily view's time-of-day
 * styling (see web `dailyTime.ts`) assumes this order, so every insert or
 * start-time edit must re-sort. Zero-padded 24h strings sort lexically.
 */
function sortTasks(tasks: ScheduleTask[]): ScheduleTask[] {
  return [...tasks].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

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
    items: readAllScheduleItems(),
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
// scheduled items, standing instructions, recent history) in a single model
// call and persist it onto the schedule.
router.post("/:id/generate", async (req, res) => {
  const { id } = req.params;
  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const result = await generateScheduleTasks(
    {
      date: schedule.date,
      dayContext: schedule.dayContext,
      items: readAllScheduleItems(),
    },
    resolveAiOptions(req.body),
  );
  if ("error" in result) {
    const status =
      result.error === "No tasks found in this schedule" ? 422 : 500;
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
  res.status(200).json({ schedule: updated, usage: result.usage });
});

// Ask the model to apply one natural-language change to the day's task list and
// return a PROPOSED full list for the user to review. This is read-only: nothing
// is persisted until the user accepts via PUT /:id/tasks.
router.post("/:id/edit-preview", async (req, res) => {
  const { id } = req.params;
  const { instruction } = req.body as { instruction?: unknown };

  if (typeof instruction !== "string" || instruction.trim() === "") {
    res.status(400).json({ error: "instruction is required" });
    return;
  }

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const currentTasks = schedule.tasks ?? [];
  if (currentTasks.length === 0) {
    res.status(400).json({ error: "This schedule has no tasks to edit" });
    return;
  }

  const result = await editScheduleTasks(
    {
      date: schedule.date,
      dayContext: schedule.dayContext,
      items: readAllScheduleItems(),
      currentTasks,
      instruction,
    },
    resolveAiOptions(req.body),
  );
  if ("error" in result) {
    const status =
      result.error === "No tasks found in this schedule" ? 422 : 500;
    res.status(status).json({ error: result.error });
    return;
  }

  // Reconstruct a full proposed task list for the diff, WITHOUT persisting it.
  // A task the model kept (matched by id) carries its original status, link, and
  // completion bookkeeping with only its plan fields overlaid; a new task gets a
  // fresh id and pending status.
  const byId = new Map(currentTasks.map((t) => [t.id, t]));
  const proposal: ScheduleTask[] = result.tasks.map((edited) => {
    const existing = edited.id ? byId.get(edited.id) : undefined;
    if (existing) {
      return {
        ...existing,
        startTime: edited.startTime,
        endTime: edited.endTime,
        label: edited.label,
      };
    }
    return {
      id: crypto.randomUUID(),
      startTime: edited.startTime,
      endTime: edited.endTime,
      label: edited.label,
      status: "pending" as const,
    };
  });

  res.status(200).json({ proposal: sortTasks(proposal), usage: result.usage });
});

const TASK_STATUSES: TaskStatus[] = [
  "pending",
  "completed",
  "future",
  "wontDo",
];

/**
 * Remove the completion this task previously logged on its linked item.
 * Best-effort: the item may have been deleted from its page in the meantime, so
 * a miss is not an error. Mutates the task; caller persists the schedule.
 */
function removeLinkedCompletion(task: ScheduleTask): void {
  const completionId = task.itemCompletionId;
  if (!completionId) return;
  const item = task.itemId ? readScheduleItem(task.itemId) : null;
  if (item) {
    const remaining = item.completions.filter((c) => c.id !== completionId);
    if (remaining.length !== item.completions.length) {
      item.completions = remaining;
      item.updatedAt = new Date().toISOString();
      writeScheduleItem(item);
    }
  }
  delete task.itemCompletionId;
}

/**
 * Log a completion on the task's linked item and remember its id so unchecking
 * can undo it. If the item was deleted since linking, drop the stale link
 * instead of failing the task update.
 */
function logLinkedCompletion(task: ScheduleTask): void {
  if (!task.itemId || task.itemCompletionId) return;
  const item = readScheduleItem(task.itemId);
  if (!item) {
    delete task.itemId;
    return;
  }
  const completion: Completion = {
    id: crypto.randomUUID(),
    performedAt: new Date().toISOString(),
  };
  item.completions = [...item.completions, completion];
  item.updatedAt = new Date().toISOString();
  writeScheduleItem(item);
  task.itemCompletionId = completion.id;
}

// Update a single task's status, notes, plan fields, and/or item link. All
// fields are optional, but at least one must be present. `itemId: null` clears
// the link.
router.patch("/:id/tasks/:taskId", (req, res) => {
  const { id, taskId } = req.params;
  const { status, notes, label, startTime, endTime, itemId } = req.body as {
    status?: unknown;
    notes?: unknown;
    label?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    itemId?: unknown;
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
  if (
    label !== undefined &&
    (typeof label !== "string" || label.trim() === "")
  ) {
    res.status(400).json({ error: "label must be a non-empty string" });
    return;
  }
  if (
    startTime !== undefined &&
    (typeof startTime !== "string" || !TIME_PATTERN.test(startTime))
  ) {
    res.status(400).json({ error: "startTime must be HH:MM (24h)" });
    return;
  }
  if (
    endTime !== undefined &&
    endTime !== null &&
    (typeof endTime !== "string" || !TIME_PATTERN.test(endTime))
  ) {
    res.status(400).json({ error: "endTime must be HH:MM (24h) or null" });
    return;
  }
  if (itemId !== undefined && itemId !== null && typeof itemId !== "string") {
    res.status(400).json({ error: "itemId must be a string or null" });
    return;
  }
  if (
    status === undefined &&
    notes === undefined &&
    label === undefined &&
    startTime === undefined &&
    endTime === undefined &&
    itemId === undefined
  ) {
    res.status(400).json({
      error: "status, notes, label, startTime, endTime, or itemId is required",
    });
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

  if (typeof itemId === "string" && !readScheduleItem(itemId)) {
    res.status(400).json({ error: "Schedule item not found" });
    return;
  }

  // Reject an end that lands before the start, comparing against whichever
  // value this edit leaves in place.
  const nextStart = startTime === undefined ? task.startTime : startTime;
  const nextEnd = endTime === undefined ? task.endTime : endTime;
  if (nextEnd !== null && nextEnd < nextStart) {
    res.status(400).json({ error: "endTime must not be before startTime" });
    return;
  }

  if (label !== undefined) task.label = label.trim();
  if (startTime !== undefined) task.startTime = startTime;
  if (endTime !== undefined) task.endTime = endTime;

  if (notes !== undefined) task.notes = notes;

  if (itemId !== undefined) {
    const next = itemId === null ? undefined : itemId;
    if (task.itemId !== next) {
      // Re-linking: undo the completion the old link created before switching.
      removeLinkedCompletion(task);
      if (next === undefined) delete task.itemId;
      else task.itemId = next;
    }
  }

  if (status !== undefined) task.status = status as TaskStatus;

  // Invariant: a completed linked task owns exactly one item completion;
  // anything else owns none.
  if (task.status === "completed") {
    logLinkedCompletion(task);
  } else {
    removeLinkedCompletion(task);
  }

  // A changed start time can move this task within the day; keep order intact.
  if (startTime !== undefined && schedule.tasks) {
    schedule.tasks = sortTasks(schedule.tasks);
  }

  schedule.updatedAt = new Date().toISOString();
  writeSchedule(schedule);
  res.status(200).json({ schedule });
});

// Add a single user-authored task to a day. Tasks are otherwise produced in
// bulk by /generate; this lets the user insert one by hand. Kept chronological.
router.post("/:id/tasks", (req, res) => {
  const { id } = req.params;
  const { label, startTime, endTime } = req.body as {
    label?: unknown;
    startTime?: unknown;
    endTime?: unknown;
  };

  if (typeof label !== "string" || label.trim() === "") {
    res.status(400).json({ error: "label is required" });
    return;
  }
  if (typeof startTime !== "string" || !TIME_PATTERN.test(startTime)) {
    res.status(400).json({ error: "startTime must be HH:MM (24h)" });
    return;
  }
  if (
    endTime !== undefined &&
    endTime !== null &&
    (typeof endTime !== "string" || !TIME_PATTERN.test(endTime))
  ) {
    res.status(400).json({ error: "endTime must be HH:MM (24h) or null" });
    return;
  }
  if (typeof endTime === "string" && endTime < startTime) {
    res.status(400).json({ error: "endTime must not be before startTime" });
    return;
  }

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const task: ScheduleTask = {
    id: crypto.randomUUID(),
    startTime,
    endTime: typeof endTime === "string" ? endTime : null,
    label: label.trim(),
    status: "pending",
  };
  schedule.tasks = sortTasks([...(schedule.tasks ?? []), task]);
  schedule.updatedAt = new Date().toISOString();
  writeSchedule(schedule);
  res.status(201).json({ schedule });
});

// Replace the day's whole task list — the "accept" step of an AI edit. Only plan
// fields (label/start/end) and membership come from the client; a task matched
// by id keeps its server-side status, link, and completion bookkeeping, while
// any current task left out is removed (undoing its completion like a delete).
router.put("/:id/tasks", (req, res) => {
  const { id } = req.params;
  const { tasks } = req.body as { tasks?: unknown };

  if (!Array.isArray(tasks)) {
    res.status(400).json({ error: "tasks must be an array" });
    return;
  }

  for (const t of tasks) {
    if (typeof t !== "object" || t === null) {
      res.status(400).json({ error: "each task must be an object" });
      return;
    }
    const {
      id: taskId,
      label,
      startTime,
      endTime,
    } = t as {
      id?: unknown;
      label?: unknown;
      startTime?: unknown;
      endTime?: unknown;
    };
    if (taskId !== undefined && typeof taskId !== "string") {
      res.status(400).json({ error: "task id must be a string" });
      return;
    }
    if (typeof label !== "string" || label.trim() === "") {
      res.status(400).json({ error: "label is required" });
      return;
    }
    if (typeof startTime !== "string" || !TIME_PATTERN.test(startTime)) {
      res.status(400).json({ error: "startTime must be HH:MM (24h)" });
      return;
    }
    if (
      endTime !== undefined &&
      endTime !== null &&
      (typeof endTime !== "string" || !TIME_PATTERN.test(endTime))
    ) {
      res.status(400).json({ error: "endTime must be HH:MM (24h) or null" });
      return;
    }
    if (typeof endTime === "string" && endTime < startTime) {
      res.status(400).json({ error: "endTime must not be before startTime" });
      return;
    }
  }

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const incoming = tasks as Array<{
    id?: string;
    label: string;
    startTime: string;
    endTime?: string | null;
  }>;
  const current = schedule.tasks ?? [];
  const byId = new Map(current.map((t) => [t.id, t]));
  const keptIds = new Set<string>();

  const nextTasks: ScheduleTask[] = incoming.map((t) => {
    const endTime = typeof t.endTime === "string" ? t.endTime : null;
    const existing = t.id ? byId.get(t.id) : undefined;
    if (existing) {
      keptIds.add(existing.id);
      return {
        ...existing,
        label: t.label.trim(),
        startTime: t.startTime,
        endTime,
      };
    }
    return {
      id: crypto.randomUUID(),
      label: t.label.trim(),
      startTime: t.startTime,
      endTime,
      status: "pending" as const,
    };
  });

  // Anything dropped from the day is removed — undo its logged completion, the
  // same bookkeeping as DELETE /:id/tasks/:taskId.
  for (const task of current) {
    if (keptIds.has(task.id)) continue;
    removeLinkedCompletion(task);
  }

  schedule.tasks = sortTasks(nextTasks);
  schedule.updatedAt = new Date().toISOString();
  writeSchedule(schedule);
  res.status(200).json({ schedule });
});

// Delete a single task. If it had a logged completion on a linked item (i.e. it
// was completed), undo it first so nothing is left orphaned — the same
// bookkeeping as moving a task out of "completed".
router.delete("/:id/tasks/:taskId", (req, res) => {
  const { id, taskId } = req.params;
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

  removeLinkedCompletion(task);

  schedule.tasks = (schedule.tasks ?? []).filter((t) => t.id !== taskId);
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
