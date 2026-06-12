/**
 * Outcome of a task. `pending` is the default; the other three are terminal
 * states the user sets explicitly. `future` means "still do this, just later";
 * `wontDo` means "drop it". Replaces the old `completed: boolean`.
 */
export type TaskStatus = "pending" | "completed" | "future" | "wontDo";

/** A single time-blocked item parsed from a schedule's free-text content. */
export type ScheduleTask = {
  id: string;
  startTime: string; // 24h "HH:MM", e.g. "07:30" — drives time-of-day styling
  endTime: string | null; // 24h "HH:MM" or null when the block is open-ended
  label: string;
  status: TaskStatus;
  notes?: string; // free-text context the user attaches to the task
  choreId?: string; // the chore this task performs, when linked
  choreCompletionId?: string; // completion logged when completed; kept so unchecking can undo it
};

export type Schedule = {
  id: string;
  date: string; // "YYYY-MM-DD" — the day the schedule is for
  content: string; // the schedule text (the AI's input for task parsing)
  tasks?: ScheduleTask[]; // structured tasks, present once the content is parsed
  createdAt: string;
  updatedAt: string;
};
