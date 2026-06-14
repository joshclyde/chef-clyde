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
  choreId?: string; // the chore this task performs, when linked
  choreCompletionId?: string; // completion logged when completed; kept so unchecking can undo it
  todoId?: string; // the one-off to-do this task fulfills, when linked
  todoCompletionAt?: string; // completedAt this task wrote onto the to-do; kept so unchecking can undo it
  hobbyTaskId?: string; // the hobby task this performs, when linked
  hobbyTaskCompletionId?: string; // completion logged when completed; kept so unchecking can undo it
};

export type Schedule = {
  id: string;
  date: string; // "YYYY-MM-DD" — the day the schedule is for
  dayContext: string; // the user's one-off notes for this day, fed into the generator
  tasks?: ScheduleTask[]; // structured tasks, present once the day has been generated
  createdAt: string;
  updatedAt: string;
};
