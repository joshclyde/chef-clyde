/** A single time-blocked item parsed from a schedule's free-text content. */
export type ScheduleTask = {
  id: string;
  startTime: string; // 24h "HH:MM", e.g. "07:30" — drives time-of-day styling
  endTime: string | null; // 24h "HH:MM" or null when the block is open-ended
  label: string;
  completed: boolean;
};

export type Schedule = {
  id: string;
  date: string; // "YYYY-MM-DD" — the day the schedule is for
  content: string; // the schedule text (the AI's input for task parsing)
  tasks?: ScheduleTask[]; // structured tasks, present once the content is parsed
  createdAt: string;
  updatedAt: string;
};
