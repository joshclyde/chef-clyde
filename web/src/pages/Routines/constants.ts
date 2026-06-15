import type {
  DayOfWeek,
  FrequencyUnit,
  RoutineOccurrenceKind,
  TimeOfDay,
} from "./useRoutines";

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

/**
 * The parts of the day used to lay out the breakdown, in clock order. "any" is
 * handled separately as a trailing "Anytime" section, so it's not listed here.
 */
export const DAY_PARTS: Exclude<TimeOfDay, "any">[] = [
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
];

/** Human-readable section titles for each day part. */
export const DAY_PART_LABEL: Record<TimeOfDay, string> = {
  morning: "Morning",
  midday: "Midday",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  any: "Anytime",
};

/** The occurrence kinds offered in the routine editor — recurring only. */
export const OCCURRENCE_KINDS: { kind: RoutineOccurrenceKind; label: string }[] =
  [
    { kind: "weekly", label: "Weekly (by day of week)" },
    { kind: "frequency", label: "Every N days/weeks/months" },
  ];
