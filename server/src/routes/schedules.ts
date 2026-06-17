import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";

import { readAllChores, readChore, writeChore } from "../db/chores";
import { findHobbyByTaskId, readAllHobbies, writeHobby } from "../db/hobbies";
import { findRoutineById, readAllRoutines, writeRoutine } from "../db/routines";
import {
  getSchedulesDir,
  getSoftDeleteDir,
  readAllSchedules,
  readSchedule,
  writeSchedule,
} from "../db/schedules";
import { readAllTodos, readTodo, writeTodo } from "../db/todos";
import {
  buildSchedulePrompt,
  generateScheduleTasks,
} from "../services/schedule";
import type { Completion } from "../types/chore";
import type { Schedule, ScheduleTask, TaskStatus } from "../types/schedule";

/** All open (not-yet-completed) to-dos — what the generator considers. */
function openTodos() {
  return readAllTodos().filter((t) => !t.completedAt);
}

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
    chores: readAllChores(),
    todos: openTodos(),
    hobbies: readAllHobbies(),
    routines: readAllRoutines(),
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
    todos: openTodos(),
    hobbies: readAllHobbies(),
    routines: readAllRoutines(),
  });
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

/**
 * Clear the completion this task wrote onto its linked to-do. Only undoes a
 * completion we created (tracked via todoCompletionAt) so we never clobber one
 * the user set on the To-Dos page. Best-effort: the to-do may have been deleted.
 * Mutates the task; caller persists the schedule.
 */
function clearLinkedTodo(task: ScheduleTask): void {
  const completedAt = task.todoCompletionAt;
  if (!completedAt) return;
  const todo = task.todoId ? readTodo(task.todoId) : null;
  if (todo && todo.completedAt === completedAt) {
    delete todo.completedAt;
    todo.updatedAt = new Date().toISOString();
    writeTodo(todo);
  }
  delete task.todoCompletionAt;
}

/**
 * Mark the task's linked to-do done and remember the timestamp so unchecking
 * can undo it. Skips a to-do already completed elsewhere (so it stays owned by
 * whoever finished it). If the to-do was deleted since linking, drop the stale
 * link instead of failing the task update.
 */
function completeLinkedTodo(task: ScheduleTask): void {
  if (!task.todoId || task.todoCompletionAt) return;
  const todo = readTodo(task.todoId);
  if (!todo) {
    delete task.todoId;
    return;
  }
  if (todo.completedAt) return; // already done elsewhere; don't claim ownership
  const now = new Date().toISOString();
  todo.completedAt = now;
  todo.updatedAt = now;
  writeTodo(todo);
  task.todoCompletionAt = now;
}

/**
 * Remove the hobby-task completion this task previously logged. Best-effort:
 * the hobby or its task may have been deleted in the meantime, so a miss is not
 * an error. Mutates the task; caller persists the schedule.
 */
function removeLinkedHobbyTaskCompletion(task: ScheduleTask): void {
  const completionId = task.hobbyTaskCompletionId;
  if (!completionId) return;
  const hobby = task.hobbyTaskId ? findHobbyByTaskId(task.hobbyTaskId) : null;
  const hobbyTask = hobby?.tasks.find((t) => t.id === task.hobbyTaskId);
  if (hobby && hobbyTask) {
    const remaining = hobbyTask.completions.filter(
      (c) => c.id !== completionId,
    );
    if (remaining.length !== hobbyTask.completions.length) {
      hobbyTask.completions = remaining;
      hobby.updatedAt = new Date().toISOString();
      writeHobby(hobby);
    }
  }
  delete task.hobbyTaskCompletionId;
}

/**
 * Log a completion on the task's linked hobby task and remember its id so
 * unchecking can undo it. If the hobby task was deleted since linking, drop the
 * stale link instead of failing the task update.
 */
function logLinkedHobbyTaskCompletion(task: ScheduleTask): void {
  if (!task.hobbyTaskId || task.hobbyTaskCompletionId) return;
  const hobby = findHobbyByTaskId(task.hobbyTaskId);
  const hobbyTask = hobby?.tasks.find((t) => t.id === task.hobbyTaskId);
  if (!hobby || !hobbyTask) {
    delete task.hobbyTaskId;
    return;
  }
  const completion: Completion = {
    id: crypto.randomUUID(),
    performedAt: new Date().toISOString(),
  };
  hobbyTask.completions = [...hobbyTask.completions, completion];
  hobby.updatedAt = new Date().toISOString();
  writeHobby(hobby);
  task.hobbyTaskCompletionId = completion.id;
}

/**
 * Remove the routine completion this task previously logged. Best-effort: the
 * routine may have been deleted in the meantime, so a miss is not an error.
 * Mutates the task; caller persists the schedule.
 */
function removeLinkedRoutineCompletion(task: ScheduleTask): void {
  const completionId = task.routineCompletionId;
  if (!completionId) return;
  const routine = task.routineId ? findRoutineById(task.routineId) : null;
  if (routine) {
    const remaining = routine.completions.filter((c) => c.id !== completionId);
    if (remaining.length !== routine.completions.length) {
      routine.completions = remaining;
      routine.updatedAt = new Date().toISOString();
      writeRoutine(routine);
    }
  }
  delete task.routineCompletionId;
}

/**
 * Log a completion on the task's linked routine and remember its id so
 * unchecking can undo it. If the routine was deleted since linking, drop the
 * stale link instead of failing the task update.
 */
function logLinkedRoutineCompletion(task: ScheduleTask): void {
  if (!task.routineId || task.routineCompletionId) return;
  const routine = findRoutineById(task.routineId);
  if (!routine) {
    delete task.routineId;
    return;
  }
  const completion: Completion = {
    id: crypto.randomUUID(),
    performedAt: new Date().toISOString(),
  };
  routine.completions = [...routine.completions, completion];
  routine.updatedAt = new Date().toISOString();
  writeRoutine(routine);
  task.routineCompletionId = completion.id;
}

// Update a single task's status, notes, and/or chore link. All fields are
// optional, but at least one must be present. `choreId: null` clears the link.
router.patch("/:id/tasks/:taskId", (req, res) => {
  const { id, taskId } = req.params;
  const {
    status,
    notes,
    label,
    startTime,
    endTime,
    choreId,
    todoId,
    hobbyTaskId,
    routineId,
  } = req.body as {
    status?: unknown;
    notes?: unknown;
    label?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    choreId?: unknown;
    todoId?: unknown;
    hobbyTaskId?: unknown;
    routineId?: unknown;
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
  if (
    choreId !== undefined &&
    choreId !== null &&
    typeof choreId !== "string"
  ) {
    res.status(400).json({ error: "choreId must be a string or null" });
    return;
  }
  if (todoId !== undefined && todoId !== null && typeof todoId !== "string") {
    res.status(400).json({ error: "todoId must be a string or null" });
    return;
  }
  if (
    hobbyTaskId !== undefined &&
    hobbyTaskId !== null &&
    typeof hobbyTaskId !== "string"
  ) {
    res.status(400).json({ error: "hobbyTaskId must be a string or null" });
    return;
  }
  if (
    routineId !== undefined &&
    routineId !== null &&
    typeof routineId !== "string"
  ) {
    res.status(400).json({ error: "routineId must be a string or null" });
    return;
  }
  if (
    status === undefined &&
    notes === undefined &&
    label === undefined &&
    startTime === undefined &&
    endTime === undefined &&
    choreId === undefined &&
    todoId === undefined &&
    hobbyTaskId === undefined &&
    routineId === undefined
  ) {
    res.status(400).json({
      error:
        "status, notes, label, startTime, endTime, choreId, todoId, hobbyTaskId, or routineId is required",
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

  if (typeof choreId === "string" && !readChore(choreId)) {
    res.status(400).json({ error: "Chore not found" });
    return;
  }
  if (typeof todoId === "string" && !readTodo(todoId)) {
    res.status(400).json({ error: "Todo not found" });
    return;
  }
  if (typeof hobbyTaskId === "string" && !findHobbyByTaskId(hobbyTaskId)) {
    res.status(400).json({ error: "Hobby task not found" });
    return;
  }
  if (typeof routineId === "string" && !findRoutineById(routineId)) {
    res.status(400).json({ error: "Routine not found" });
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

  if (choreId !== undefined) {
    const next = choreId === null ? undefined : choreId;
    if (task.choreId !== next) {
      // Re-linking: undo the completion the old link created before switching.
      removeLinkedCompletion(task);
      if (next === undefined) delete task.choreId;
      else task.choreId = next;
    }
  }

  if (todoId !== undefined) {
    const next = todoId === null ? undefined : todoId;
    if (task.todoId !== next) {
      // Re-linking: undo the completion the old link created before switching.
      clearLinkedTodo(task);
      if (next === undefined) delete task.todoId;
      else task.todoId = next;
    }
  }

  if (hobbyTaskId !== undefined) {
    const next = hobbyTaskId === null ? undefined : hobbyTaskId;
    if (task.hobbyTaskId !== next) {
      // Re-linking: undo the completion the old link created before switching.
      removeLinkedHobbyTaskCompletion(task);
      if (next === undefined) delete task.hobbyTaskId;
      else task.hobbyTaskId = next;
    }
  }

  if (routineId !== undefined) {
    const next = routineId === null ? undefined : routineId;
    if (task.routineId !== next) {
      // Re-linking: undo the completion the old link created before switching.
      removeLinkedRoutineCompletion(task);
      if (next === undefined) delete task.routineId;
      else task.routineId = next;
    }
  }

  if (status !== undefined) task.status = status as TaskStatus;

  // Invariant: a completed linked task owns exactly one chore completion, at
  // most one to-do completion, one hobby-task completion, and one routine
  // completion; anything else owns none.
  if (task.status === "completed") {
    logLinkedCompletion(task);
    completeLinkedTodo(task);
    logLinkedHobbyTaskCompletion(task);
    logLinkedRoutineCompletion(task);
  } else {
    removeLinkedCompletion(task);
    clearLinkedTodo(task);
    removeLinkedHobbyTaskCompletion(task);
    removeLinkedRoutineCompletion(task);
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

// Delete a single task. If it had logged completions on a linked chore / to-do
// / hobby / routine (i.e. it was completed), undo those first so nothing is
// left orphaned — the same bookkeeping as moving a task out of "completed".
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
  clearLinkedTodo(task);
  removeLinkedHobbyTaskCompletion(task);
  removeLinkedRoutineCompletion(task);

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
