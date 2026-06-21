import { useEffect, useState } from "react";

import {
  createScheduleItem,
  deleteScheduleItem,
  deleteScheduleItemCompletion,
  fetchScheduleItems,
  logScheduleItemCompletion,
  type ScheduleItem,
  type ScheduleItemInput,
  updateScheduleItem,
} from "../../lib/scheduleItems";

export type FrequencyUnit = "days" | "weeks" | "months";
export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
export type TimeOfDay =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "any";

export type Completion = {
  id: string;
  performedAt: string;
};

/** When a routine recurs — weekly or on a cadence. No one-offs or events. */
export type RoutineOccurrence =
  | { kind: "weekly"; days: DayOfWeek[] }
  | { kind: "frequency"; value: number; unit: FrequencyUnit };

export type RoutineOccurrenceKind = RoutineOccurrence["kind"];

export type Routine = {
  id: string;
  label: string;
  timeOfDay: TimeOfDay;
  typicalTimeMinutes?: number;
  occurrence: RoutineOccurrence;
  completions: Completion[];
  createdAt: string;
  updatedAt: string;
};

/** The user-editable fields sent to the create/update endpoints. */
export type RoutineInput = {
  label: string;
  timeOfDay: TimeOfDay;
  typicalTimeMinutes?: number;
  occurrence: RoutineOccurrence;
};

/** Project the unified item onto the routine view this page works with. */
function toRoutine(item: ScheduleItem): Routine {
  const occ = item.occurrence;
  const occurrence: RoutineOccurrence =
    occ.kind === "weekly"
      ? { kind: "weekly", days: occ.days }
      : occ.kind === "frequency"
        ? { kind: "frequency", value: occ.value, unit: occ.unit }
        : { kind: "frequency", value: 1, unit: "weeks" };
  return {
    id: item.id,
    label: item.label,
    timeOfDay: item.timeOfDay ?? "any",
    typicalTimeMinutes: item.typicalTimeMinutes,
    occurrence,
    completions: item.completions,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Map the routine form fields onto a unified create/update payload. */
function toItemInput(input: RoutineInput): ScheduleItemInput {
  return {
    category: "routine",
    label: input.label,
    occurrence: input.occurrence,
    timeOfDay: input.timeOfDay,
    ...(input.typicalTimeMinutes != null
      ? { typicalTimeMinutes: input.typicalTimeMinutes }
      : {}),
    details: {},
  };
}

export type DueStatus = "never" | "overdue" | "upcoming";

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addFrequency(date: Date, value: number, unit: FrequencyUnit): Date {
  const d = new Date(date);
  if (unit === "days") d.setDate(d.getDate() + value);
  else if (unit === "weeks") d.setDate(d.getDate() + value * 7);
  else d.setMonth(d.getMonth() + value);
  return d;
}

/** Frequency expressed in days, so cadence routines with different units compare sensibly. */
export function frequencyDays(value: number, unit: FrequencyUnit): number {
  const perUnit: Record<FrequencyUnit, number> = {
    days: 1,
    weeks: 7,
    months: 30,
  };
  return value * perUnit[unit];
}

/** Most recent completion date for a routine, or null if it's never been done. */
export function lastPerformed(routine: Routine): Date | null {
  if (routine.completions.length === 0) return null;
  const latest = Math.max(
    ...routine.completions.map((c) => new Date(c.performedAt).getTime()),
  );
  return new Date(latest);
}

/**
 * When a cadence (frequency) routine is next due = last performed + frequency.
 * Null if it's never been done or isn't a frequency routine.
 */
export function nextDue(routine: Routine): Date | null {
  if (routine.occurrence.kind !== "frequency") return null;
  const last = lastPerformed(routine);
  if (!last) return null;
  return addFrequency(last, routine.occurrence.value, routine.occurrence.unit);
}

/** Readiness of a cadence routine. Returns null for non-frequency routines. */
export function dueStatus(routine: Routine): DueStatus | null {
  if (routine.occurrence.kind !== "frequency") return null;
  const due = nextDue(routine);
  if (!due) return "never";
  return startOfDay(due) < startOfDay(new Date()) ? "overdue" : "upcoming";
}

/** Sort key for cadence routines: never-done first (0), then by due date ascending. */
export function dueSortKey(routine: Routine): number {
  const due = nextDue(routine);
  return due ? due.getTime() : 0;
}

export function useRoutines() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduleItems("routine")
      .then(setItems)
      .catch(() => setError("Failed to load routines."))
      .finally(() => setLoading(false));
  }, []);

  const routines = items.map(toRoutine);

  async function createRoutine(input: RoutineInput) {
    const item = await createScheduleItem(toItemInput(input));
    setItems((prev) => [...prev, item]);
  }

  async function updateRoutine(id: string, input: RoutineInput) {
    const item = await updateScheduleItem(id, toItemInput(input));
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }

  async function deleteRoutine(id: string) {
    await deleteScheduleItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function logCompletion(id: string, performedAt?: string) {
    const item = await logScheduleItemCompletion(id, performedAt);
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }

  async function deleteCompletion(id: string, completionId: string) {
    const item = await deleteScheduleItemCompletion(id, completionId);
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }

  return {
    routines,
    loading,
    error,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    logCompletion,
    deleteCompletion,
  };
}
