/**
 * Client-side mirror of the server's unified `ScheduleItem` plus the small REST
 * helpers every feature hook builds on. Chores, hobbies, routines, and to-dos
 * are all the same record server-side (one `category` apart); each page keeps its
 * own view types and maps to/from this shape in its `use*` hook.
 *
 * The `details` object is modeled as a permissive superset here (the server
 * enforces the real per-category shape), so adapters can read `details.room`,
 * `details.groupLabel`, etc. without fighting a discriminated union.
 */

export type FrequencyUnit = "days" | "weeks" | "months";

export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export type TimeOfDay =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "any";

export type Completion = { id: string; performedAt: string };

/** Unified occurrence. `weekly` carries no time-of-day — that lives on the item. */
export type Occurrence =
  | { kind: "event"; date: string; startTime?: string; endTime?: string }
  | { kind: "weekly"; days: DayOfWeek[] }
  | { kind: "frequency"; value: number; unit: FrequencyUnit }
  | { kind: "oneoff" };

export type ScheduleItemCategory = "chore" | "hobby" | "routine" | "todo";

export type ScheduleItemDetails = {
  room?: string; // chore
  floor?: string; // chore
  groupLabel?: string; // hobby — the hobby name
  dueDate?: string; // todo — "YYYY-MM-DD"
};

export type ScheduleItem = {
  id: string;
  category: ScheduleItemCategory;
  label: string;
  occurrence: Occurrence;
  completions: Completion[];
  typicalTimeMinutes?: number;
  notes?: string;
  timeOfDay?: TimeOfDay;
  details: ScheduleItemDetails;
  createdAt: string;
  updatedAt: string;
};

/** The user-editable fields sent to the create/update endpoints. */
export type ScheduleItemInput = {
  category: ScheduleItemCategory;
  label: string;
  occurrence: Occurrence;
  typicalTimeMinutes?: number;
  notes?: string;
  timeOfDay?: TimeOfDay;
  details?: ScheduleItemDetails;
};

import { useEffect, useState } from "react";

const BASE = "/api/schedule-items";
const JSON_HEADERS = { "Content-Type": "application/json" };

export async function fetchScheduleItems(
  category?: ScheduleItemCategory,
): Promise<ScheduleItem[]> {
  const url = category ? `${BASE}?category=${category}` : BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load schedule items");
  const data = (await res.json()) as { items: ScheduleItem[] };
  return data.items;
}

export async function createScheduleItem(
  input: ScheduleItemInput,
): Promise<ScheduleItem> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create item");
  return ((await res.json()) as { item: ScheduleItem }).item;
}

export async function updateScheduleItem(
  id: string,
  input: ScheduleItemInput,
): Promise<ScheduleItem> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return ((await res.json()) as { item: ScheduleItem }).item;
}

export async function deleteScheduleItem(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: "DELETE" });
}

export async function logScheduleItemCompletion(
  id: string,
  performedAt?: string,
): Promise<ScheduleItem> {
  const res = await fetch(`${BASE}/${id}/completions`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(performedAt ? { performedAt } : {}),
  });
  if (!res.ok) throw new Error("Failed to log completion");
  return ((await res.json()) as { item: ScheduleItem }).item;
}

export async function deleteScheduleItemCompletion(
  id: string,
  completionId: string,
): Promise<ScheduleItem> {
  const res = await fetch(`${BASE}/${id}/completions/${completionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete completion");
  return ((await res.json()) as { item: ScheduleItem }).item;
}

/** Read-only list of every schedule item, for the schedule pages' link UI. */
export function useScheduleItems() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduleItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}

/** A human-readable name for an item (a hobby task shows its hobby group). */
export function itemDisplayName(item: ScheduleItem): string {
  if (item.category === "hobby" && item.details.groupLabel) {
    return `${item.details.groupLabel} — ${item.label}`;
  }
  return item.label;
}
