import { useEffect, useState } from "react";

import { todayLocal } from "../../lib/date";
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

export type Todo = {
  id: string;
  title: string;
  dueDate?: string; // "YYYY-MM-DD"
  notes?: string;
  completedAt?: string; // ISO timestamp; absent = open
  createdAt: string;
  updatedAt: string;
};

/** The user-editable fields sent to the create/update endpoints. */
export type TodoInput = {
  title: string;
  dueDate?: string;
  notes?: string;
};

/**
 * Project the unified item onto the to-do view. A to-do is binary done/not-done,
 * so its first (and only) completion is what `completedAt` reflects.
 */
function toTodo(item: ScheduleItem): Todo {
  return {
    id: item.id,
    title: item.label,
    dueDate: item.details.dueDate,
    notes: item.notes,
    completedAt: item.completions[0]?.performedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Map the to-do form fields onto a unified create/update payload. */
function toItemInput(input: TodoInput): ScheduleItemInput {
  return {
    category: "todo",
    label: input.title,
    occurrence: { kind: "oneoff" },
    ...(input.notes ? { notes: input.notes } : {}),
    details: input.dueDate ? { dueDate: input.dueDate } : {},
  };
}

export type DueStatus = "none" | "overdue" | "today" | "upcoming";

/** A to-do's deadline status, derived from its dueDate against today (local). */
export function dueStatus(todo: Todo): DueStatus {
  if (!todo.dueDate) return "none";
  const today = todayLocal();
  if (todo.dueDate < today) return "overdue";
  if (todo.dueDate === today) return "today";
  return "upcoming";
}

/**
 * Sort key for "most in need of attention first": dated to-dos by their due
 * date ascending, undated ones last.
 */
export function dueSortKey(todo: Todo): number {
  if (!todo.dueDate) return Number.POSITIVE_INFINITY;
  const [y, m, d] = todo.dueDate.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function useTodos() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScheduleItems("todo")
      .then(setItems)
      .catch(() => setError("Failed to load to-dos."))
      .finally(() => setLoading(false));
  }, []);

  const todos = items.map(toTodo);

  async function createTodo(input: TodoInput) {
    const item = await createScheduleItem(toItemInput(input));
    setItems((prev) => [...prev, item]);
  }

  async function updateTodo(id: string, input: TodoInput) {
    const item = await updateScheduleItem(id, toItemInput(input));
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }

  // A to-do is done/not-done: completing logs a single completion, un-completing
  // removes the one it logged.
  async function toggleComplete(id: string, completed: boolean) {
    if (completed) {
      const item = await logScheduleItemCompletion(id);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      return;
    }
    const current = items.find((i) => i.id === id);
    const completionId = current?.completions[0]?.id;
    if (!completionId) return;
    const item = await deleteScheduleItemCompletion(id, completionId);
    setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
  }

  async function deleteTodo(id: string) {
    await deleteScheduleItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    toggleComplete,
    deleteTodo,
  };
}
