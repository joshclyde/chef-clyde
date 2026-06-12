import { useEffect, useState } from "react";

export type FrequencyUnit = "days" | "weeks" | "months";

export type Completion = {
  id: string;
  performedAt: string;
};

export type Chore = {
  id: string;
  name: string;
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  typicalTimeMinutes?: number;
  room?: string;
  floor?: string;
  completions: Completion[];
  createdAt: string;
  updatedAt: string;
};

/** The user-editable fields sent to the create/update endpoints. */
export type ChoreInput = {
  name: string;
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  typicalTimeMinutes?: number;
  room?: string;
  floor?: string;
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

/** Frequency expressed in days, so chores with different units sort sensibly. */
export function frequencyDays(chore: Chore): number {
  const perUnit: Record<FrequencyUnit, number> = {
    days: 1,
    weeks: 7,
    months: 30,
  };
  return chore.frequencyValue * perUnit[chore.frequencyUnit];
}

/** Most recent completion date, or null if the chore has never been done. */
export function lastPerformed(chore: Chore): Date | null {
  if (chore.completions.length === 0) return null;
  const latest = Math.max(
    ...chore.completions.map((c) => new Date(c.performedAt).getTime()),
  );
  return new Date(latest);
}

/** When the chore is due next = last performed + frequency. Null if never done. */
export function nextDue(chore: Chore): Date | null {
  const last = lastPerformed(chore);
  if (!last) return null;
  return addFrequency(last, chore.frequencyValue, chore.frequencyUnit);
}

export function dueStatus(chore: Chore): DueStatus {
  const due = nextDue(chore);
  if (!due) return "never";
  return startOfDay(due) < startOfDay(new Date()) ? "overdue" : "upcoming";
}

/**
 * Sort key for "most in need of attention first": never-done chores sort to the
 * very top (0), then overdue/upcoming by their due date ascending.
 */
export function dueSortKey(chore: Chore): number {
  const due = nextDue(chore);
  return due ? due.getTime() : 0;
}

export function useChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chores")
      .then((res) => res.json())
      .then((data: { chores: Chore[] }) => setChores(data.chores))
      .catch(() => setError("Failed to load chores."))
      .finally(() => setLoading(false));
  }, []);

  async function createChore(input: ChoreInput) {
    const res = await fetch("/api/chores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create chore");
    const data = (await res.json()) as { chore: Chore };
    setChores((prev) => [...prev, data.chore]);
  }

  async function updateChore(id: string, input: ChoreInput) {
    const res = await fetch(`/api/chores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update chore");
    const data = (await res.json()) as { chore: Chore };
    setChores((prev) => prev.map((c) => (c.id === id ? data.chore : c)));
  }

  async function deleteChore(id: string) {
    await fetch(`/api/chores/${id}`, { method: "DELETE" });
    setChores((prev) => prev.filter((c) => c.id !== id));
  }

  async function logCompletion(id: string, performedAt?: string) {
    const res = await fetch(`/api/chores/${id}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(performedAt ? { performedAt } : {}),
    });
    if (!res.ok) throw new Error("Failed to log completion");
    const data = (await res.json()) as { chore: Chore };
    setChores((prev) => prev.map((c) => (c.id === id ? data.chore : c)));
  }

  async function deleteCompletion(id: string, completionId: string) {
    const res = await fetch(`/api/chores/${id}/completions/${completionId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete completion");
    const data = (await res.json()) as { chore: Chore };
    setChores((prev) => prev.map((c) => (c.id === id ? data.chore : c)));
  }

  return {
    chores,
    loading,
    error,
    createChore,
    updateChore,
    deleteChore,
    logCompletion,
    deleteCompletion,
  };
}
