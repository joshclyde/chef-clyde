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

/** Project the unified item onto the chore view this page works with. */
function toChore(item: ScheduleItem): Chore {
  const occ = item.occurrence;
  return {
    id: item.id,
    name: item.label,
    frequencyValue: occ.kind === "frequency" ? occ.value : 1,
    frequencyUnit: occ.kind === "frequency" ? occ.unit : "weeks",
    typicalTimeMinutes: item.typicalTimeMinutes,
    room: item.details.room,
    floor: item.details.floor,
    completions: item.completions,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Map the chore form fields onto a unified create/update payload. */
function toItemInput(input: ChoreInput): ScheduleItemInput {
  return {
    category: "chore",
    label: input.name,
    occurrence: {
      kind: "frequency",
      value: input.frequencyValue,
      unit: input.frequencyUnit,
    },
    ...(input.typicalTimeMinutes != null
      ? { typicalTimeMinutes: input.typicalTimeMinutes }
      : {}),
    details: {
      ...(input.room ? { room: input.room } : {}),
      ...(input.floor ? { floor: input.floor } : {}),
    },
  };
}

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
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduleItems("chore")
      .then(setItems)
      .catch(() => setError("Failed to load chores."))
      .finally(() => setLoading(false));
  }, []);

  const chores = items.map(toChore);

  async function createChore(input: ChoreInput) {
    const item = await createScheduleItem(toItemInput(input));
    setItems((prev) => [...prev, item]);
  }

  async function updateChore(id: string, input: ChoreInput) {
    const item = await updateScheduleItem(id, toItemInput(input));
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }

  async function deleteChore(id: string) {
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
