import { useEffect, useMemo, useState } from "react";

import {
  createScheduleItem,
  deleteScheduleItem,
  deleteScheduleItemCompletion,
  fetchScheduleItems,
  logScheduleItemCompletion,
  type Occurrence as ItemOccurrence,
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

/**
 * The web's occurrence shape keeps `timeOfDay` ON the weekly variant for the
 * editor's convenience; the server stores it on the item, so the hook maps
 * between the two. Other kinds are identical to the stored shape.
 */
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

/** The group an item belongs to — its hobby name. Falls back to its own label. */
function groupOf(item: ScheduleItem): string {
  return item.details.groupLabel ?? item.label;
}

/** Stored occurrence → the editor's shape, lifting the item's time-of-day onto weekly. */
function toWebOccurrence(
  occ: ItemOccurrence,
  timeOfDay: TimeOfDay | undefined,
): Occurrence {
  if (occ.kind === "weekly") {
    return {
      kind: "weekly",
      days: occ.days,
      ...(timeOfDay && timeOfDay !== "any" ? { timeOfDay } : {}),
    };
  }
  return occ;
}

/** Editor's occurrence → the stored occurrence plus the item-level time-of-day. */
function fromWebOccurrence(occ: Occurrence): {
  occurrence: ItemOccurrence;
  timeOfDay?: TimeOfDay;
} {
  if (occ.kind === "weekly") {
    return {
      occurrence: { kind: "weekly", days: occ.days },
      timeOfDay: occ.timeOfDay,
    };
  }
  return { occurrence: occ };
}

function toHobbyTask(item: ScheduleItem): HobbyTask {
  return {
    id: item.id,
    label: item.label,
    typicalTimeMinutes: item.typicalTimeMinutes,
    occurrence: toWebOccurrence(item.occurrence, item.timeOfDay),
    completions: item.completions,
  };
}

/** Build the create/update payload for one task under a hobby group. */
function toItemInput(
  groupLabel: string,
  notes: string | undefined,
  task: HobbyTaskInput,
): ScheduleItemInput {
  const { occurrence, timeOfDay } = fromWebOccurrence(task.occurrence);
  return {
    category: "hobby",
    label: task.label,
    occurrence,
    ...(task.typicalTimeMinutes != null
      ? { typicalTimeMinutes: task.typicalTimeMinutes }
      : {}),
    ...(notes ? { notes } : {}),
    ...(timeOfDay ? { timeOfDay } : {}),
    details: { groupLabel },
  };
}

/** A hobby created in the UI that has no tasks yet, so it isn't stored server-side. */
type EmptyGroup = { name: string; notes?: string; createdAt: string };

/** Reassemble the flat items (plus any task-less groups) into hobby cards. */
function buildHobbies(
  items: ScheduleItem[],
  emptyGroups: EmptyGroup[],
): Hobby[] {
  const groups = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = groupOf(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const hobbies: Hobby[] = [];
  for (const [name, groupItems] of groups) {
    const notes = groupItems.find((i) => i.notes)?.notes;
    const createdAt = groupItems.reduce(
      (min, i) => (i.createdAt < min ? i.createdAt : min),
      groupItems[0].createdAt,
    );
    const updatedAt = groupItems.reduce(
      (max, i) => (i.updatedAt > max ? i.updatedAt : max),
      groupItems[0].updatedAt,
    );
    hobbies.push({
      id: name,
      name,
      ...(notes ? { notes } : {}),
      tasks: groupItems.map(toHobbyTask),
      createdAt,
      updatedAt,
    });
  }

  for (const g of emptyGroups) {
    if (groups.has(g.name)) continue;
    hobbies.push({
      id: g.name,
      name: g.name,
      ...(g.notes ? { notes: g.notes } : {}),
      tasks: [],
      createdAt: g.createdAt,
      updatedAt: g.createdAt,
    });
  }

  return hobbies;
}

export function useHobbies() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [emptyGroups, setEmptyGroups] = useState<EmptyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduleItems("hobby")
      .then(setItems)
      .catch(() => setError("Failed to load hobbies."))
      .finally(() => setLoading(false));
  }, []);

  const hobbies = useMemo(
    () => buildHobbies(items, emptyGroups),
    [items, emptyGroups],
  );

  async function createHobby(input: HobbyInput) {
    if (input.tasks.length === 0) {
      // A hobby with no tasks has nothing to store; hold it locally until a task
      // is added, mirroring the old "create then add tasks" flow.
      setEmptyGroups((prev) => [
        ...prev.filter((g) => g.name !== input.name),
        {
          name: input.name,
          notes: input.notes,
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }
    const created = await Promise.all(
      input.tasks.map((t) =>
        createScheduleItem(toItemInput(input.name, input.notes, t)),
      ),
    );
    setItems((prev) => [...prev, ...created]);
    setEmptyGroups((prev) => prev.filter((g) => g.name !== input.name));
  }

  /**
   * Apply a whole-hobby edit (name, notes, tasks) by reconciling the group's
   * items: update tasks matched by id, create new ones, delete any dropped. A
   * rename re-tags every task with the new group label.
   */
  async function updateHobby(id: string, input: HobbyInput) {
    const current = items.filter((i) => groupOf(i) === id);
    const currentById = new Map(current.map((i) => [i.id, i]));

    const results: ScheduleItem[] = [];
    const keptIds = new Set<string>();
    for (const task of input.tasks) {
      const payload = toItemInput(input.name, input.notes, task);
      if (task.id && currentById.has(task.id)) {
        results.push(await updateScheduleItem(task.id, payload));
        keptIds.add(task.id);
      } else {
        results.push(await createScheduleItem(payload));
      }
    }

    await Promise.all(
      current
        .filter((i) => !keptIds.has(i.id))
        .map((i) => deleteScheduleItem(i.id)),
    );

    setItems((prev) => [...prev.filter((i) => groupOf(i) !== id), ...results]);
    setEmptyGroups((prev) => {
      const without = prev.filter((g) => g.name !== id && g.name !== input.name);
      // If the edit left the group with no tasks, keep its card around locally.
      return results.length === 0
        ? [
            ...without,
            {
              name: input.name,
              notes: input.notes,
              createdAt: new Date().toISOString(),
            },
          ]
        : without;
    });
  }

  async function deleteHobby(id: string) {
    const groupItems = items.filter((i) => groupOf(i) === id);
    await Promise.all(groupItems.map((i) => deleteScheduleItem(i.id)));
    setItems((prev) => prev.filter((i) => groupOf(i) !== id));
    setEmptyGroups((prev) => prev.filter((g) => g.name !== id));
  }

  async function logCompletion(
    _hobbyId: string,
    taskId: string,
    performedAt?: string,
  ) {
    const item = await logScheduleItemCompletion(taskId, performedAt);
    setItems((prev) => prev.map((i) => (i.id === taskId ? item : i)));
  }

  async function deleteCompletion(
    _hobbyId: string,
    taskId: string,
    completionId: string,
  ) {
    const item = await deleteScheduleItemCompletion(taskId, completionId);
    setItems((prev) => prev.map((i) => (i.id === taskId ? item : i)));
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
