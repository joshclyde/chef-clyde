import { useEffect, useState } from "react";

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
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/routines")
      .then((res) => res.json())
      .then((data: { routines: Routine[] }) => setRoutines(data.routines))
      .catch(() => setError("Failed to load routines."))
      .finally(() => setLoading(false));
  }, []);

  async function createRoutine(input: RoutineInput) {
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create routine");
    const data = (await res.json()) as { routine: Routine };
    setRoutines((prev) => [...prev, data.routine]);
  }

  async function updateRoutine(id: string, input: RoutineInput) {
    const res = await fetch(`/api/routines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update routine");
    const data = (await res.json()) as { routine: Routine };
    setRoutines((prev) => prev.map((r) => (r.id === id ? data.routine : r)));
  }

  async function deleteRoutine(id: string) {
    await fetch(`/api/routines/${id}`, { method: "DELETE" });
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }

  async function logCompletion(id: string, performedAt?: string) {
    const res = await fetch(`/api/routines/${id}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(performedAt ? { performedAt } : {}),
    });
    if (!res.ok) throw new Error("Failed to log routine");
    const data = (await res.json()) as { routine: Routine };
    setRoutines((prev) => prev.map((r) => (r.id === id ? data.routine : r)));
  }

  async function deleteCompletion(id: string, completionId: string) {
    const res = await fetch(
      `/api/routines/${id}/completions/${completionId}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Failed to delete completion");
    const data = (await res.json()) as { routine: Routine };
    setRoutines((prev) => prev.map((r) => (r.id === id ? data.routine : r)));
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
