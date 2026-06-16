import { useMemo } from "react";

import { Card, Heading, Stack, Text } from "../../ui";
import { DAY_PART_LABEL, DAY_PARTS } from "./constants";
import styles from "./Dashboard.module.css";
import {
  describeOccurrence,
  localIsoDate,
  mondayOf,
  weekDates,
  weekdayOf,
} from "./occurrence";
import {
  frequencyDays,
  type Routine,
  type TimeOfDay,
  useRoutines,
} from "./useRoutines";

/** Order routines within a day so morning items sit above night ones. */
const TOD_ORDER: Record<TimeOfDay, number> = {
  morning: 0,
  midday: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
  any: 5,
};

/** Whether a routine lands on a given weekday for the "this week" grid. */
function landsOn(
  routine: Routine,
  weekday: ReturnType<typeof weekdayOf>,
): boolean {
  const occ = routine.occurrence;
  if (occ.kind === "weekly") return occ.days.includes(weekday);
  // Daily cadences show every day; coarser cadences live in the typical-day view.
  return frequencyDays(occ.value, occ.unit) <= 1;
}

export default function Dashboard() {
  const { routines, loading, error } = useRoutines();

  const today = localIsoDate(new Date());
  const week = useMemo(() => weekDates(mondayOf(new Date())), []);

  // Routines bucketed by time of day, in clock order within each bucket.
  const byPart = useMemo(() => {
    const map = new Map<TimeOfDay, Routine[]>();
    for (const part of [...DAY_PARTS, "any"] as TimeOfDay[]) map.set(part, []);
    for (const routine of routines) {
      map.get(routine.timeOfDay)?.push(routine);
    }
    return map;
  }, [routines]);

  function routinesOn(date: Date): Routine[] {
    const wd = weekdayOf(date);
    return routines
      .filter((r) => landsOn(r, wd))
      .sort((a, b) => TOD_ORDER[a.timeOfDay] - TOD_ORDER[b.timeOfDay]);
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Routines</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Routines</Heading>
        <Text variant="danger">{error}</Text>
      </Stack>
    );
  }

  const noRoutines = routines.length === 0;
  const anytime = byPart.get("any") ?? [];

  return (
    <Stack gap="xl" className={styles.page}>
      <Stack gap="2xs">
        <Heading level={1}>Routines</Heading>
        <Text variant="muted">
          A picture of your typical day — from your morning rituals to winding
          down at night.
        </Text>
      </Stack>

      {noRoutines ? (
        <Text variant="muted">
          No routines yet. Add some on the Manage page to see your day take
          shape here.
        </Text>
      ) : (
        <>
          <Stack gap="2xs">
            <Heading level={2}>Your typical day</Heading>
            <div className={styles.dayGrid}>
              {DAY_PARTS.map((part) => {
                const items = byPart.get(part) ?? [];
                return (
                  <Card key={part} className={styles.partCard}>
                    <Text
                      size="xs"
                      variant="strong"
                      className={styles.partTitle}
                    >
                      {DAY_PART_LABEL[part]}
                    </Text>
                    {items.length === 0 ? (
                      <Text size="xs" variant="subtle">
                        Nothing yet
                      </Text>
                    ) : (
                      <Stack gap="2xs">
                        {items.map((routine) => (
                          <div key={routine.id} className={styles.partItem}>
                            <Text size="sm">{routine.label}</Text>
                            <Text size="xs" variant="muted">
                              {describeOccurrence(routine)}
                              {routine.typicalTimeMinutes != null
                                ? ` · ${routine.typicalTimeMinutes} min`
                                : ""}
                            </Text>
                          </div>
                        ))}
                      </Stack>
                    )}
                  </Card>
                );
              })}
            </div>
          </Stack>

          {anytime.length > 0 && (
            <Stack gap="2xs">
              <Heading level={2}>Anytime</Heading>
              <div className={styles.anytimeRow}>
                {anytime.map((routine) => (
                  <span
                    key={routine.id}
                    className={`${styles.chip} ${styles.any}`}
                  >
                    {routine.label} · {describeOccurrence(routine)}
                  </span>
                ))}
              </div>
            </Stack>
          )}

          <Stack gap="2xs">
            <Heading level={2}>This week</Heading>
            <div className={styles.grid}>
              {week.map((date) => {
                const items = routinesOn(date);
                const isToday = localIsoDate(date) === today;
                return (
                  <div
                    key={date.toISOString()}
                    className={`${styles.gridDay} ${isToday ? styles.gridToday : ""}`}
                  >
                    <Text size="xs" variant={isToday ? "strong" : "muted"}>
                      {weekdayOf(date)} {date.getDate()}
                    </Text>
                    <Stack gap="3xs" className={styles.gridItems}>
                      {items.map((routine) => (
                        <span
                          key={routine.id}
                          className={`${styles.chip} ${styles[routine.timeOfDay]}`}
                          title={`${DAY_PART_LABEL[routine.timeOfDay]} · ${describeOccurrence(routine)}`}
                        >
                          {routine.label}
                        </span>
                      ))}
                    </Stack>
                  </div>
                );
              })}
            </div>
          </Stack>
        </>
      )}
    </Stack>
  );
}
