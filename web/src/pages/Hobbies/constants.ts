import type {
  DayOfWeek,
  FrequencyUnit,
  OccurrenceKind,
  TimeOfDay,
} from "./useHobbies";

export const FREQUENCY_UNITS: FrequencyUnit[] = ["days", "weeks", "months"];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export const TIMES_OF_DAY: TimeOfDay[] = [
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
  "any",
];

/** The occurrence kinds offered in the task editor, with human-readable labels. */
export const OCCURRENCE_KINDS: { kind: OccurrenceKind; label: string }[] = [
  { kind: "event", label: "Calendar event (specific date/time)" },
  { kind: "weekly", label: "Weekly (by day of week)" },
  { kind: "frequency", label: "Every N days/weeks/months" },
  { kind: "oneoff", label: "One-off (no fixed time)" },
];
