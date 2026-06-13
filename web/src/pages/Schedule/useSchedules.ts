import { useEffect, useState } from "react";

export type TaskStatus = "pending" | "completed" | "future" | "wontDo";

export type ScheduleTask = {
  id: string;
  startTime: string; // 24h "HH:MM"
  endTime: string | null; // 24h "HH:MM" or null when open-ended
  label: string;
  status: TaskStatus;
  notes?: string;
  choreId?: string; // the chore this task performs, when linked
  choreCompletionId?: string; // completion logged when completed (server-managed)
};

export type Schedule = {
  id: string;
  date: string; // "YYYY-MM-DD"
  dayContext: string; // the user's one-off notes for this day
  tasks?: ScheduleTask[];
  createdAt: string;
  updatedAt: string;
};

/** The user-editable fields sent to the create/update endpoints. */
export type ScheduleInput = {
  date: string;
  dayContext: string;
};

/** Fields accepted by the task PATCH endpoint. `choreId: null` clears the link. */
export type TaskPatch = {
  status?: TaskStatus;
  notes?: string;
  choreId?: string | null;
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

  /**
   * Generate the day's task list from all of its inputs (day notes, chores,
   * standing instructions, recent history) in one step, and store the result.
   */
  async function generateTasks(id: string) {
    const res = await fetch(`/api/schedules/${id}/generate`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Failed to generate task list");
    }
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
    return data.schedule;
  }

  /**
   * Fetch the exact prompt the generator would send for a day's notes, without
   * running the model — powers the "what the AI will see" preview.
   */
  async function previewPrompt(date: string, dayContext: string) {
    const res = await fetch("/api/schedules/preview-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, dayContext }),
    });
    if (!res.ok) throw new Error("Failed to load prompt preview");
    const data = (await res.json()) as { prompt: string };
    return data.prompt;
  }

  /**
   * Patch a task's status, notes, and/or chore link. Optimistic: applies the
   * change locally, then reconciles with the server response (which carries
   * server-managed fields like choreCompletionId), reverting the whole task on
   * failure.
   */
  async function updateTask(id: string, taskId: string, patch: TaskPatch) {
    const prevTask = schedules
      .find((s) => s.id === id)
      ?.tasks?.find((t) => t.id === taskId);

    const apply = (update: (t: ScheduleTask) => ScheduleTask) =>
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                tasks: s.tasks?.map((t) => (t.id === taskId ? update(t) : t)),
              }
            : s,
        ),
      );

    // choreId is tri-state in the patch (absent = untouched, null = clear),
    // but plain optional on the task — only map it when present.
    const { choreId, ...rest } = patch;
    const optimistic: Partial<ScheduleTask> =
      choreId === undefined ? rest : { ...rest, choreId: choreId ?? undefined };
    apply((t) => ({ ...t, ...optimistic }));
    try {
      const res = await fetch(`/api/schedules/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const data = (await res.json()) as { schedule: Schedule };
      setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
    } catch (err) {
      // Restore the full prior task: a merge would leave behind optional keys
      // the optimistic update added.
      if (prevTask) apply(() => prevTask);
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
    generateTasks,
    previewPrompt,
    updateTask,
  };
}
