import { useEffect, useState } from "react";
import type { ScheduleTask } from "./useSchedules";

export type TaskStatus = "completed" | "current" | "past" | "upcoming";

/** A clock that re-renders on an interval so time-of-day styling stays live. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const MINUTES_PER_DAY = 24 * 60;

/** Minutes-of-day for a 24h "HH:MM" string. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Effective end of a task in minutes-of-day: its own endTime when present, else
 * the next task's start, else end of day. Assumes `tasks` is chronological.
 */
function effectiveEnd(tasks: ScheduleTask[], index: number): number {
  const task = tasks[index];
  if (task.endTime) return toMinutes(task.endTime);
  const next = tasks[index + 1];
  return next ? toMinutes(next.startTime) : MINUTES_PER_DAY;
}

/**
 * Classify a task relative to the current time. Completed always wins; otherwise
 * a task is `current` while now is within its block, `past` once its block has
 * ended (i.e. missed), and `upcoming` before it starts.
 */
export function taskStatus(
  tasks: ScheduleTask[],
  index: number,
  now: Date,
): TaskStatus {
  const task = tasks[index];
  if (task.completed) return "completed";
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(task.startTime);
  if (nowMin < start) return "upcoming";
  if (nowMin < effectiveEnd(tasks, index)) return "current";
  return "past";
}

/** A 12-hour label like "7:30 AM", or a range "7:30 AM – 8:00 AM". */
export function formatTimeRange(task: ScheduleTask): string {
  const fmt = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return task.endTime
    ? `${fmt(task.startTime)} – ${fmt(task.endTime)}`
    : fmt(task.startTime);
}
