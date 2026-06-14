import { frequencyDays, type Hobby, type HobbyTask } from "./useHobbies";

/**
 * Average minutes/week a recurring task demands; null when it has no duration
 * or isn't recurring (events + one-offs don't contribute to a weekly cadence).
 */
export function taskMinutesPerWeek(task: HobbyTask): number | null {
  if (task.typicalTimeMinutes == null) return null;
  const occ = task.occurrence;
  if (occ.kind === "frequency") {
    return (task.typicalTimeMinutes / frequencyDays(occ.value, occ.unit)) * 7;
  }
  if (occ.kind === "weekly") {
    return task.typicalTimeMinutes * occ.days.length;
  }
  return null;
}

export type WeeklyTimeCommitment = {
  minutesPerWeek: number;
  includedCount: number;
  /** Recurring tasks left out because they have no duration estimate. */
  excludedCount: number;
};

/** Total recurring minutes/week implied across every hobby's tasks. */
export function weeklyTimeCommitment(hobbies: Hobby[]): WeeklyTimeCommitment {
  let minutesPerWeek = 0;
  let includedCount = 0;
  let excludedCount = 0;
  for (const hobby of hobbies) {
    for (const task of hobby.tasks) {
      const occ = task.occurrence;
      const recurring = occ.kind === "frequency" || occ.kind === "weekly";
      if (!recurring) continue;
      const perWeek = taskMinutesPerWeek(task);
      if (perWeek == null) {
        excludedCount += 1;
        continue;
      }
      minutesPerWeek += perWeek;
      includedCount += 1;
    }
  }
  return { minutesPerWeek, includedCount, excludedCount };
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
