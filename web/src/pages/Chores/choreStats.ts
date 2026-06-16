import { FLOORS } from "./constants";
import { type Chore,frequencyDays } from "./useChores";

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

export type FrequencyGroupChore = {
  chore: Chore;
  /** Weekly contribution; null when the chore has no time estimate. */
  minutesPerWeek: number | null;
};

export type FrequencyGroup = {
  label: string;
  /** Sum over timed chores only; untimed ones are listed but not counted. */
  minutesPerWeek: number;
  timedCount: number;
  chores: FrequencyGroupChore[];
};

type FrequencyBucket = { label: string; minDays: number; maxDays: number };

/** Cadence buckets over the normalized frequency (1 week = 7 days, 1 month = 30). */
const FREQUENCY_BUCKETS: FrequencyBucket[] = [
  { label: "Daily", minDays: 1, maxDays: 1 },
  { label: "Every 2–6 days", minDays: 2, maxDays: 6 },
  { label: "Weekly / Bi-weekly", minDays: 7, maxDays: 14 },
  { label: "Every 15–31 days", minDays: 15, maxDays: 31 },
  { label: "31+ days", minDays: 32, maxDays: Infinity },
];

/** Non-empty cadence groups, most frequent first; chores by weekly share, untimed last. */
export function frequencyGroups(chores: Chore[]): FrequencyGroup[] {
  const groups: FrequencyGroup[] = FREQUENCY_BUCKETS.map(({ label }) => ({
    label,
    minutesPerWeek: 0,
    timedCount: 0,
    chores: [],
  }));
  for (const chore of chores) {
    const days = frequencyDays(chore);
    const index = FREQUENCY_BUCKETS.findIndex(
      (b) => days >= b.minDays && days <= b.maxDays,
    );
    const group = groups[Math.max(index, 0)];
    const perDay = choreMinutesPerDay(chore);
    const minutesPerWeek = perDay == null ? null : perDay * 7;
    group.chores.push({ chore, minutesPerWeek });
    if (minutesPerWeek != null) {
      group.minutesPerWeek += minutesPerWeek;
      group.timedCount += 1;
    }
  }
  for (const group of groups) {
    group.chores.sort(
      (a, b) =>
        (b.minutesPerWeek ?? -1) - (a.minutesPerWeek ?? -1) ||
        a.chore.name.localeCompare(b.chore.name),
    );
  }
  return groups.filter((group) => group.chores.length > 0);
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
