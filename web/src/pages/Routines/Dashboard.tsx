import { useMemo } from "react";

import { Card, Heading, Stack, Text } from "../../ui";
import chipStyles from "./chip.module.css";
import { DAY_PART_LABEL, DAY_PARTS } from "./constants";
import styles from "./Dashboard.module.css";
import { describeOccurrence } from "./occurrence";
import OpenTimeGrid from "./OpenTimeGrid";
import { type Routine, type TimeOfDay, useRoutines } from "./useRoutines";

export default function Dashboard() {
  const { routines, loading, error } = useRoutines();

  // Routines bucketed by time of day, in clock order within each bucket.
  const byPart = useMemo(() => {
    const map = new Map<TimeOfDay, Routine[]>();
    for (const part of [...DAY_PARTS, "any"] as TimeOfDay[]) map.set(part, []);
    for (const routine of routines) {
      map.get(routine.timeOfDay)?.push(routine);
    }
    return map;
  }, [routines]);

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
                    className={`${chipStyles.chip} ${chipStyles.any}`}
                  >
                    {routine.label} · {describeOccurrence(routine)}
                  </span>
                ))}
              </div>
            </Stack>
          )}

          <OpenTimeGrid routines={routines} />
        </>
      )}
    </Stack>
  );
}
