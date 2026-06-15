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

export type Occurrence =
  | { kind: "event"; date: string; startTime?: string; endTime?: string }
  | { kind: "weekly"; days: DayOfWeek[]; timeOfDay?: TimeOfDay }
  | { kind: "frequency"; value: number; unit: FrequencyUnit }
  | { kind: "oneoff" };

export type OccurrenceKind = Occurrence["kind"];

export type HobbyTask = {
  id: string;
  label: string;
  typicalTimeMinutes?: number;
  occurrence: Occurrence;
  completions: Completion[];
};

export type Hobby = {
  id: string;
  name: string;
  notes?: string;
  tasks: HobbyTask[];
  createdAt: string;
  updatedAt: string;
};

/** A task as sent to create/update — same shape minus server-owned fields. */
export type HobbyTaskInput = {
  id?: string; // present when editing so the server preserves its history
  label: string;
  typicalTimeMinutes?: number;
  occurrence: Occurrence;
};

/** The user-editable fields sent to the create/update endpoints. */
export type HobbyInput = {
  name: string;
  notes?: string;
  tasks: HobbyTaskInput[];
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

/** Frequency expressed in days, so cadence tasks with different units compare sensibly. */
export function frequencyDays(value: number, unit: FrequencyUnit): number {
  const perUnit: Record<FrequencyUnit, number> = {
    days: 1,
    weeks: 7,
    months: 30,
  };
  return value * perUnit[unit];
}

/** Most recent completion date for a task, or null if it's never been done. */
export function lastPerformed(task: HobbyTask): Date | null {
  if (task.completions.length === 0) return null;
  const latest = Math.max(
    ...task.completions.map((c) => new Date(c.performedAt).getTime()),
  );
  return new Date(latest);
}

/**
 * When a cadence (frequency) task is next due = last performed + frequency.
 * Null if it's never been done or isn't a frequency task.
 */
export function nextDue(task: HobbyTask): Date | null {
  if (task.occurrence.kind !== "frequency") return null;
  const last = lastPerformed(task);
  if (!last) return null;
  return addFrequency(last, task.occurrence.value, task.occurrence.unit);
}

/** Readiness of a cadence task. Returns null for non-frequency tasks. */
export function dueStatus(task: HobbyTask): DueStatus | null {
  if (task.occurrence.kind !== "frequency") return null;
  const due = nextDue(task);
  if (!due) return "never";
  return startOfDay(due) < startOfDay(new Date()) ? "overdue" : "upcoming";
}

/** Sort key for cadence tasks: never-done first (0), then by due date ascending. */
export function dueSortKey(task: HobbyTask): number {
  const due = nextDue(task);
  return due ? due.getTime() : 0;
}

export function useHobbies() {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hobbies")
      .then((res) => res.json())
      .then((data: { hobbies: Hobby[] }) => setHobbies(data.hobbies))
      .catch(() => setError("Failed to load hobbies."))
      .finally(() => setLoading(false));
  }, []);

  async function createHobby(input: HobbyInput) {
    const res = await fetch("/api/hobbies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create hobby");
    const data = (await res.json()) as { hobby: Hobby };
    setHobbies((prev) => [...prev, data.hobby]);
  }

  async function updateHobby(id: string, input: HobbyInput) {
    const res = await fetch(`/api/hobbies/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update hobby");
    const data = (await res.json()) as { hobby: Hobby };
    setHobbies((prev) => prev.map((h) => (h.id === id ? data.hobby : h)));
  }

  async function deleteHobby(id: string) {
    await fetch(`/api/hobbies/${id}`, { method: "DELETE" });
    setHobbies((prev) => prev.filter((h) => h.id !== id));
  }

  async function logCompletion(
    hobbyId: string,
    taskId: string,
    performedAt?: string,
  ) {
    const res = await fetch(
      `/api/hobbies/${hobbyId}/tasks/${taskId}/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(performedAt ? { performedAt } : {}),
      },
    );
    if (!res.ok) throw new Error("Failed to log session");
    const data = (await res.json()) as { hobby: Hobby };
    setHobbies((prev) => prev.map((h) => (h.id === hobbyId ? data.hobby : h)));
  }

  async function deleteCompletion(
    hobbyId: string,
    taskId: string,
    completionId: string,
  ) {
    const res = await fetch(
      `/api/hobbies/${hobbyId}/tasks/${taskId}/completions/${completionId}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Failed to delete session");
    const data = (await res.json()) as { hobby: Hobby };
    setHobbies((prev) => prev.map((h) => (h.id === hobbyId ? data.hobby : h)));
  }

  return {
    hobbies,
    loading,
    error,
    createHobby,
    updateHobby,
    deleteHobby,
    logCompletion,
    deleteCompletion,
  };
}
