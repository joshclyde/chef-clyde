import { useEffect, useState } from "react";

export type ScheduleTask = {
  id: string;
  startTime: string; // 24h "HH:MM"
  endTime: string | null; // 24h "HH:MM" or null when open-ended
  label: string;
  completed: boolean;
};

export type Schedule = {
  id: string;
  date: string; // "YYYY-MM-DD"
  content: string;
  tasks?: ScheduleTask[];
  createdAt: string;
  updatedAt: string;
};

/** The user-editable fields sent to the create/update endpoints. */
export type ScheduleInput = {
  date: string;
  content: string;
};

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/schedules")
      .then((res) => res.json())
      .then((data: { schedules: Schedule[] }) => setSchedules(data.schedules))
      .catch(() => setError("Failed to load schedules."))
      .finally(() => setLoading(false));
  }, []);

  /**
   * Create or update the schedule for a date. The server keeps one schedule per
   * calendar date, so replace any existing entry for that date in local state.
   */
  async function createSchedule(input: ScheduleInput) {
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to save schedule");
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) => {
      const others = prev.filter((s) => s.id !== data.schedule.id);
      return [...others, data.schedule];
    });
    return data.schedule;
  }

  async function updateSchedule(id: string, input: ScheduleInput) {
    const res = await fetch(`/api/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to update schedule");
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
  }

  async function deleteSchedule(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  /** Send a schedule's text to the AI parser and store the returned task list. */
  async function parseTasks(id: string) {
    const res = await fetch(`/api/schedules/${id}/parse`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Failed to generate task list");
    }
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
    return data.schedule;
  }

  /** Toggle a task's completion. Optimistic; reverts the local state on failure. */
  async function setTaskCompleted(
    id: string,
    taskId: string,
    completed: boolean,
  ) {
    const apply = (value: boolean) =>
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                tasks: s.tasks?.map((t) =>
                  t.id === taskId ? { ...t, completed: value } : t,
                ),
              }
            : s,
        ),
      );

    apply(completed);
    try {
      const res = await fetch(`/api/schedules/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const data = (await res.json()) as { schedule: Schedule };
      setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
    } catch (err) {
      apply(!completed); // revert
      throw err;
    }
  }

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    parseTasks,
    setTaskCompleted,
  };
}
