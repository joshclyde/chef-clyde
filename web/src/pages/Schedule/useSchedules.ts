import { useEffect, useState } from "react";

import { type AiUsage } from "../../ai/AiSettingsContext";
import { useAiSettings } from "../../ai/useAiSettings";

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
  todoId?: string; // the one-off to-do this task fulfills, when linked
  todoCompletionAt?: string; // completedAt written onto the to-do (server-managed)
  hobbyTaskId?: string; // the hobby task this performs, when linked
  hobbyTaskCompletionId?: string; // completion logged when completed (server-managed)
  routineId?: string; // the routine this performs, when linked
  routineCompletionId?: string; // completion logged when completed (server-managed)
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

/**
 * Fields accepted by the task PATCH endpoint. `choreId`/`todoId: null` clears
 * the respective link; `endTime: null` makes the task open-ended.
 */
export type TaskPatch = {
  status?: TaskStatus;
  notes?: string;
  label?: string;
  startTime?: string;
  endTime?: string | null;
  choreId?: string | null;
  todoId?: string | null;
};

/** The fields needed to create a task via the POST endpoint. */
export type NewTaskInput = {
  label: string;
  startTime: string; // 24h "HH:MM"
  endTime: string | null; // 24h "HH:MM" or null when open-ended
};

/**
 * One row sent to the replace-tasks (PUT) endpoint when accepting an AI edit.
 * `id` ties the row to an existing task (kept/modified); omit it for a new task.
 */
export type TaskPlan = {
  id?: string;
  label: string;
  startTime: string; // 24h "HH:MM"
  endTime: string | null; // 24h "HH:MM" or null when open-ended
};

export function useSchedules() {
  const { model, effort, setLastUsage } = useAiSettings();
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
    const res = await fetch(`/api/schedules/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, effort }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(data?.error ?? "Failed to generate task list");
    }
    const data = (await res.json()) as { schedule: Schedule; usage?: AiUsage };
    if (data.usage) setLastUsage(data.usage);
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
   * Ask AI to apply a natural-language edit and return the PROPOSED task list.
   * Read-only: nothing is saved until the user accepts via replaceTasks, so this
   * leaves local state untouched.
   */
  async function editPreview(id: string, instruction: string) {
    const res = await fetch(`/api/schedules/${id}/edit-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction, model, effort }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(data?.error ?? "Failed to suggest changes");
    }
    const data = (await res.json()) as {
      proposal: ScheduleTask[];
      usage?: AiUsage;
    };
    if (data.usage) setLastUsage(data.usage);
    return data.proposal;
  }

  /**
   * Replace the day's whole task list — the "accept" step of an AI edit. The
   * server preserves status/links/completions on tasks matched by id and undoes
   * completions for any task left out.
   */
  async function replaceTasks(id: string, tasks: TaskPlan[]) {
    const res = await fetch(`/api/schedules/${id}/tasks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    });
    if (!res.ok) throw new Error("Failed to apply changes");
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
    return data.schedule;
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

    // choreId/todoId are tri-state in the patch (absent = untouched, null =
    // clear), but plain optional on the task — only map them when present.
    const { choreId, todoId, ...rest } = patch;
    const optimistic: Partial<ScheduleTask> = { ...rest };
    if (choreId !== undefined) optimistic.choreId = choreId ?? undefined;
    if (todoId !== undefined) optimistic.todoId = todoId ?? undefined;
    apply((t) => ({ ...t, ...optimistic }));
    try {
      const res = await fetch(`/api/schedules/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const data = (await res.json()) as { schedule: Schedule };
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? data.schedule : s)),
      );
    } catch (err) {
      // Restore the full prior task: a merge would leave behind optional keys
      // the optimistic update added.
      if (prevTask) apply(() => prevTask);
      throw err;
    }
  }

  /** Add a user-authored task to a day; the server returns the re-sorted day. */
  async function addTask(scheduleId: string, input: NewTaskInput) {
    const res = await fetch(`/api/schedules/${scheduleId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to add task");
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? data.schedule : s)),
    );
    return data.schedule;
  }

  /** Remove a task from a day, reconciling with the server's updated schedule. */
  async function deleteTask(scheduleId: string, taskId: string) {
    const res = await fetch(`/api/schedules/${scheduleId}/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete task");
    const data = (await res.json()) as { schedule: Schedule };
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? data.schedule : s)),
    );
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
    editPreview,
    replaceTasks,
    updateTask,
    addTask,
    deleteTask,
  };
}
