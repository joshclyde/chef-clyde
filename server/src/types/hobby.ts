import type { Completion, FrequencyUnit } from "./chore";

export type DayOfWeek =
  | "Sun"
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat";

export type TimeOfDay =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "any";

/**
 * When a hobby task happens. A discriminated union so each task can be anything
 * from a concrete calendar event to a loose "sometime" idea:
 * - "event":     a one-off booking on a specific date, optionally with times.
 * - "weekly":    recurs on chosen weekdays, optionally at a rough time of day.
 * - "frequency": recurs on a cadence (every N days/weeks/months), like a chore.
 * - "oneoff":    no fixed timing; do it whenever there's room.
 */
export type Occurrence =
  | { kind: "event"; date: string; startTime?: string; endTime?: string }
  | { kind: "weekly"; days: DayOfWeek[]; timeOfDay?: TimeOfDay }
  | { kind: "frequency"; value: number; unit: FrequencyUnit }
  | { kind: "oneoff" };

export type OccurrenceKind = Occurrence["kind"];

export type HobbyTask = {
  id: string;
  label: string; // what to do, e.g. "Play pickleball", "Reserve a court"
  typicalTimeMinutes?: number; // optional duration estimate
  occurrence: Occurrence;
  completions: Completion[]; // logged times this task was done
};

export type Hobby = {
  id: string;
  name: string; // the hobby itself, e.g. "Pickleball"
  notes?: string; // optional free-text
  tasks: HobbyTask[];
  createdAt: string;
  updatedAt: string;
};
