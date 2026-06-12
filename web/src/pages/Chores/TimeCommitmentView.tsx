import { Card, Heading, Inline, Stack, Text } from "../../ui";
import {
  formatMinutes,
  timeCommitment,
  weeklyMinutesByFloor,
  weeklyMinutesByRoom,
  type BreakdownRow,
} from "./choreStats";
import type { Chore } from "./useChores";
import styles from "./Dashboard.module.css";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Stack gap="3xs">
        <Text size="xs" variant="subtle">
          {label}
        </Text>
        <Heading level={2}>{value}</Heading>
      </Stack>
    </Card>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  return (
    <Card>
      <Stack gap="sm">
        <Heading level={3}>{title}</Heading>
        <Stack gap="2xs">
          {rows.map((row) => (
            <Inline key={row.label} justify="between">
              <Text size="sm">
                {row.label}{" "}
                <Text as="span" size="xs" variant="subtle">
                  ({row.choreCount})
                </Text>
              </Text>
              <Text size="sm" variant="strong">
                {formatMinutes(row.minutesPerWeek)}/wk
              </Text>
            </Inline>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function TimeCommitmentView({ chores }: { chores: Chore[] }) {
  const { minutesPerDay, minutesPerWeek, includedCount, excludedCount } =
    timeCommitment(chores);

  const excludedNote =
    excludedCount === 0
      ? null
      : excludedCount === 1
        ? "1 chore has no time estimate and isn't included."
        : `${excludedCount} chores have no time estimate and aren't included.`;

  if (includedCount === 0) {
    return (
      <Stack gap="md">
        <Heading level={2}>Time commitment</Heading>
        <Stack gap="2xs">
          {excludedNote && (
            <Text size="sm" variant="muted">
              {excludedNote}
            </Text>
          )}
          <Text variant="muted">
            Add time estimates to your chores to see totals.
          </Text>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Heading level={2}>Time commitment</Heading>
      <div className={styles.statGrid}>
        <StatCard label="Per day" value={formatMinutes(minutesPerDay)} />
        <StatCard label="Per week" value={formatMinutes(minutesPerWeek)} />
      </div>
      {excludedNote && (
        <Text size="sm" variant="muted">
          {excludedNote}
        </Text>
      )}
      <div className={styles.breakdownGrid}>
        <BreakdownCard title="By room" rows={weeklyMinutesByRoom(chores)} />
        <BreakdownCard title="By floor" rows={weeklyMinutesByFloor(chores)} />
      </div>
    </Stack>
  );
}
