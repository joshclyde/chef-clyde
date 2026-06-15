import type { Completion, FrequencyUnit } from "./chore";
import type { DayOfWeek, TimeOfDay } from "./hobby";

/**
 * When a routine recurs. A narrowed version of the hobby `Occurrence` union: a
 * routine is one of the small, repeating things that shape a day, so it only
 * ever recurs — never a one-off or a booked calendar event:
 * - "weekly":    recurs on chosen weekdays.
 * - "frequency": recurs on a cadence (every N days/weeks/months), like a chore.
 *
 * Unlike a hobby's weekly task, the time of day lives on the Routine itself (so
 * both weekly and frequency routines can be placed in the morning/night
 * breakdown), not on the weekly variant.
 */
export type RoutineOccurrence =
  | { kind: "weekly"; days: DayOfWeek[] }
  | { kind: "frequency"; value: number; unit: FrequencyUnit };

export type RoutineOccurrenceKind = RoutineOccurrence["kind"];

export type Routine = {
  id: string;
  label: string; // what to do, e.g. "Brush teeth", "Make coffee"
  timeOfDay: TimeOfDay; // which part of the day it belongs to — drives the breakdown
  typicalTimeMinutes?: number; // optional duration estimate
  occurrence: RoutineOccurrence;
  completions: Completion[]; // logged times this routine was done (frequency readiness)
  createdAt: string;
  updatedAt: string;
};
