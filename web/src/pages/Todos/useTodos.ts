import { useEffect, useState } from "react";

import { todayLocal } from "../../lib/date";

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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/todos")
      .then((res) => res.json())
      .then((data: { todos: Todo[] }) => setTodos(data.todos))
      .catch(() => setError("Failed to load to-dos."))
      .finally(() => setLoading(false));
  }, []);

  async function createTodo(input: TodoInput) {
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to create to-do");
    const data = (await res.json()) as { todo: Todo };
    setTodos((prev) => [...prev, data.todo]);
  }

  async function updateTodo(id: string, input: TodoInput) {
    const res = await fetch(`/api/todos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update to-do");
    const data = (await res.json()) as { todo: Todo };
    setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
  }

  async function toggleComplete(id: string, completed: boolean) {
    const res = await fetch(`/api/todos/${id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) throw new Error("Failed to update to-do");
    const data = (await res.json()) as { todo: Todo };
    setTodos((prev) => prev.map((t) => (t.id === id ? data.todo : t)));
  }

  async function deleteTodo(id: string) {
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
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
