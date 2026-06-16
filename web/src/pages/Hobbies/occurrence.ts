import type { DayOfWeek, HobbyTask, Occurrence } from "./useHobbies";

export const DAY_INDEX: Record<DayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DAY_NAMES: DayOfWeek[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/** Parse a "YYYY-MM-DD" string into a local Date (no timezone shift). */
export function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local "YYYY-MM-DD" for a Date (en-CA renders ISO order in local time). */
export function localIsoDate(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

/** "Tue Jun 16" for a Date. */
export function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** The DayOfWeek a Date falls on. */
export function weekdayOf(date: Date): DayOfWeek {
  return DAY_NAMES[date.getDay()];
}

/** Monday of the week containing `date` (weeks run Mon→Sun). */
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // 0 for Mon … 6 for Sun
  d.setDate(d.getDate() - offset);
  return d;
}

/** The 7 dates of the week starting at `monday`. */
export function weekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** A short time-of-event string for an event occurrence, or "" when none. */
function eventTime(occ: Extract<Occurrence, { kind: "event" }>): string {
  if (occ.startTime && occ.endTime) return `${occ.startTime}–${occ.endTime}`;
  if (occ.startTime) return occ.startTime;
  return "";
}

/** A human-readable summary of when a task happens (cadence only, no readiness). */
export function describeOccurrence(task: HobbyTask): string {
  const occ = task.occurrence;
  switch (occ.kind) {
    case "event": {
      const time = eventTime(occ);
      const day = shortDate(parseLocalDate(occ.date));
      return time ? `${day} · ${time}` : day;
    }
    case "weekly": {
      const days = occ.days.join("/");
      const tod =
        occ.timeOfDay && occ.timeOfDay !== "any" ? ` · ${occ.timeOfDay}` : "";
      return `Every ${days}${tod}`;
    }
    case "frequency":
      return occ.value === 1
        ? `Every ${occ.unit.slice(0, -1)}`
        : `Every ${occ.value} ${occ.unit}`;
    case "oneoff":
      return "One-off";
  }
}
