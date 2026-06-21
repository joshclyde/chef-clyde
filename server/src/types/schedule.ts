/**
 * Outcome of a task. `pending` is the default; the other three are terminal
 * states the user sets explicitly. `future` means "still do this, just later";
 * `wontDo` means "drop it". Replaces the old `completed: boolean`.
 */
export type TaskStatus = "pending" | "completed" | "future" | "wontDo";

/** A single time-blocked item produced when a day's task list is generated. */
export type ScheduleTask = {
  id: string;
  startTime: string; // 24h "HH:MM", e.g. "07:30" — drives time-of-day styling
  endTime: string | null; // 24h "HH:MM" or null when the block is open-ended
  label: string;
  status: TaskStatus;
  notes?: string; // free-text context the user attaches to the task
  itemId?: string; // the ScheduleItem (chore/hobby/routine/to-do) this task performs, when linked
  itemCompletionId?: string; // completion logged on the item when completed; kept so unchecking can undo it
};

export type Schedule = {
  id: string;
  date: string; // "YYYY-MM-DD" — the day the schedule is for
  dayContext: string; // the user's one-off notes for this day, fed into the generator
  tasks?: ScheduleTask[]; // structured tasks, present once the day has been generated
  createdAt: string;
  updatedAt: string;
};
