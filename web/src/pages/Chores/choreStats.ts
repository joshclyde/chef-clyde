import { FLOORS } from "./constants";
import { frequencyDays, type Chore } from "./useChores";

export const UNASSIGNED_LABEL = "Unassigned";

/** Average minutes/day this chore demands; null if it has no time estimate. */
export function choreMinutesPerDay(chore: Chore): number | null {
  if (chore.typicalTimeMinutes == null) return null;
  return chore.typicalTimeMinutes / frequencyDays(chore);
}

export type TimeCommitment = {
  minutesPerDay: number;
  minutesPerWeek: number;
  includedCount: number;
  /** Chores left out of the totals because they have no time estimate. */
  excludedCount: number;
};

export function timeCommitment(chores: Chore[]): TimeCommitment {
  let minutesPerDay = 0;
  let includedCount = 0;
  for (const chore of chores) {
    const perDay = choreMinutesPerDay(chore);
    if (perDay == null) continue;
    minutesPerDay += perDay;
    includedCount += 1;
  }
  return {
    minutesPerDay,
    minutesPerWeek: minutesPerDay * 7,
    includedCount,
    excludedCount: chores.length - includedCount,
  };
}

export type BreakdownRow = {
  label: string;
  minutesPerWeek: number;
  choreCount: number;
};

function groupWeeklyMinutes(
  chores: Chore[],
  groupOf: (chore: Chore) => string | undefined,
): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>();
  for (const chore of chores) {
    const perDay = choreMinutesPerDay(chore);
    if (perDay == null) continue;
    const label = groupOf(chore) ?? UNASSIGNED_LABEL;
    const row = rows.get(label) ?? { label, minutesPerWeek: 0, choreCount: 0 };
    row.minutesPerWeek += perDay * 7;
    row.choreCount += 1;
    rows.set(label, row);
  }
  return [...rows.values()];
}

/** Weekly minutes per room, biggest time sink first; Unassigned last. */
export function weeklyMinutesByRoom(chores: Chore[]): BreakdownRow[] {
  return groupWeeklyMinutes(chores, (c) => c.room).sort((a, b) => {
    if (a.label === UNASSIGNED_LABEL) return 1;
    if (b.label === UNASSIGNED_LABEL) return -1;
    return b.minutesPerWeek - a.minutesPerWeek;
  });
}

/** Weekly minutes per floor in physical order (Basement → Attic); Unassigned last. */
export function weeklyMinutesByFloor(chores: Chore[]): BreakdownRow[] {
  const order = (label: string) => {
    if (label === UNASSIGNED_LABEL) return Number.MAX_SAFE_INTEGER;
    const index = FLOORS.indexOf(label as (typeof FLOORS)[number]);
    return index === -1 ? FLOORS.length : index;
  };
  return groupWeeklyMinutes(chores, (c) => c.floor).sort(
    (a, b) => order(a.label) - order(b.label),
  );
}

/** "45m" under an hour, "6h 30m" above ("7h" when even). Rounds for display only. */
export function formatMinutes(minutes: number): string {
  if (minutes > 0 && minutes < 0.5) return "<1m";
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
