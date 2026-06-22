import type { TimeOfDay } from "../../lib/scheduleItems";
import type { ScheduleTask } from "./useSchedules";

/**
 * The five concrete periods of the day, in chronological order. Ids reuse the
 * `TimeOfDay` vocabulary already on chores/hobbies/routines (minus "any"), so the
 * V2 schedule view stays consistent with the rest of the app.
 *
 * `startMin` is minutes-of-day; each period runs until the next one's start, and
 * Night wraps past midnight (21:00 → 04:59).
 */
export type PeriodId = Exclude<TimeOfDay, "any">;

export type Period = { id: PeriodId; label: string; startMin: number };

export const PERIODS: Period[] = [
  { id: "morning", label: "Morning", startMin: 5 * 60 }, // 05:00
  { id: "midday", label: "Midday", startMin: 11 * 60 }, // 11:00
  { id: "afternoon", label: "Afternoon", startMin: 14 * 60 }, // 14:00
  { id: "evening", label: "Evening", startMin: 17 * 60 }, // 17:00
  { id: "night", label: "Night", startMin: 21 * 60 }, // 21:00–04:59 (wraps)
];

/** Minutes-of-day for a 24h "HH:MM" string. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Which period a minutes-of-day value falls in. Night owns the 00:00–04:59 wrap. */
function periodForMinutes(min: number): PeriodId {
  // Walk periods from last to first; the first whose start we're at/after wins.
  for (let i = PERIODS.length - 1; i >= 0; i--) {
    if (min >= PERIODS[i].startMin) return PERIODS[i].id;
  }
  // Before morning (00:00–04:59) belongs to the night block that wrapped midnight.
  return "night";
}

/** The period a task belongs to, bucketed by its start time. */
export function periodForTask(task: ScheduleTask): PeriodId {
  return periodForMinutes(toMinutes(task.startTime));
}

/** The period the clock is currently in. */
export function currentPeriodId(now: Date): PeriodId {
  return periodForMinutes(now.getHours() * 60 + now.getMinutes());
}

export function periodLabel(id: PeriodId): string {
  return PERIODS.find((p) => p.id === id)?.label ?? id;
}

/** A period paired with the (chronological) tasks that fall in it. */
export type PeriodGroup = { period: Period; tasks: ScheduleTask[] };

/**
 * Group tasks into the five periods, in chronological period order. Tasks keep
 * their incoming order within a group (callers pass chronological tasks).
 */
export function groupTasksByPeriod(tasks: ScheduleTask[]): PeriodGroup[] {
  return PERIODS.map((period) => ({
    period,
    tasks: tasks.filter((t) => periodForTask(t) === period.id),
  }));
}
