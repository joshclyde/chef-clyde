/**
 * A one-off, miscellaneous thing the user wants to get done that doesn't fit a
 * recurring chore. Captured on the To-Dos page and fed into the daily schedule
 * generator so the model can weave it into the day. A to-do is binary
 * done/not-done — `completedAt` absent means open.
 */
export type Todo = {
  id: string;
  title: string;
  dueDate?: string; // "YYYY-MM-DD", optional
  notes?: string; // optional free-text context the model can use to place it well
  completedAt?: string; // ISO timestamp when finished; absent = open
  createdAt: string;
  updatedAt: string;
};
