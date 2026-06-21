/**
 * The one normalized record for everything that can land on a schedule — chores,
 * hobbies, routines, and one-off to-dos. Each is a `ScheduleItem` with a
 * `category`; the user-facing pages stay distinct but all read and write this
 * single shape, and the schedule links to an item by a single `itemId`.
 *
 * A category only uses the fields it needs (a one-off to-do has no weekly
 * recurrence, a chore has no group label) — that's expected. Genuinely
 * category-specific data lives in the nested `details` object so the shared
 * envelope stays clean.
 */

export type FrequencyUnit = "days" | "weeks" | "months";

export type DayOfWeek = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export type TimeOfDay =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "any";

export type Completion = {
  id: string;
  performedAt: string; // ISO timestamp of when the item was done
};

/**
 * When an item happens. A discriminated union so each item can be anything from
 * a concrete calendar event to a loose "sometime" idea:
 * - "event":     a one-off booking on a specific date, optionally with times.
 * - "weekly":    recurs on chosen weekdays.
 * - "frequency": recurs on a cadence (every N days/weeks/months), like a chore.
 * - "oneoff":    no fixed timing; do it whenever there's room.
 *
 * `timeOfDay` is intentionally NOT on the weekly variant — it's a shared
 * placement hint on the item itself (see `ScheduleItemBase`).
 */
export type Occurrence =
  | { kind: "event"; date: string; startTime?: string; endTime?: string }
  | { kind: "weekly"; days: DayOfWeek[] }
  | { kind: "frequency"; value: number; unit: FrequencyUnit }
  | { kind: "oneoff" };

export type OccurrenceKind = Occurrence["kind"];

export type ScheduleItemCategory = "chore" | "hobby" | "routine" | "todo";

/** Chore-only data: where in the home it happens. */
export type ChoreDetails = { room?: string; floor?: string };

/** Hobby-only data: the hobby this task belongs to, e.g. "Pickleball". */
export type HobbyDetails = { groupLabel?: string };

/** Routines have no category-specific data today; reserved for future fields. */
export type RoutineDetails = Record<string, never>;

/** To-do-only data: an optional "YYYY-MM-DD" deadline (distinct from an event). */
export type TodoDetails = { dueDate?: string };

/**
 * Fields shared by EVERY category. Anything here may apply to (or generalize to)
 * more categories over time — e.g. `timeOfDay` anchors routines today but is
 * expected to be used by chores and others later, so it lives here rather than
 * in a category's `details`.
 */
type ScheduleItemBase = {
  id: string;
  label: string; // chore.name / routine.label / todo.title / hobbyTask.label
  occurrence: Occurrence; // how/when it recurs
  completions: Completion[]; // unified log; a to-do has 0 or 1
  typicalTimeMinutes?: number; // optional duration estimate
  notes?: string; // free-text context (hobby/to-do today; usable by any)
  timeOfDay?: TimeOfDay; // placement hint — routines today, chores etc. later
  createdAt: string;
  updatedAt: string;
};

/**
 * Discriminated on `category`; `details` carries only that category's extra
 * data, so a narrowed item exposes exactly the fields that category uses
 * (e.g. `item.category === "chore"` ⇒ `item.details.room`).
 */
export type ScheduleItem = ScheduleItemBase &
  (
    | { category: "chore"; details: ChoreDetails }
    | { category: "hobby"; details: HobbyDetails }
    | { category: "routine"; details: RoutineDetails }
    | { category: "todo"; details: TodoDetails }
  );
