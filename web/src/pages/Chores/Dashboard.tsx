import { Heading, Stack, Text } from "../../ui";
import { FrequencyBreakdownView } from "./FrequencyBreakdownView";
import { TimeCommitmentView } from "./TimeCommitmentView";
import { useChores } from "./useChores";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { chores, loading, error } = useChores();

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Dashboard</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Heading level={1}>Dashboard</Heading>
      {error ? (
        <Text variant="danger">{error}</Text>
      ) : chores.length === 0 ? (
        <Text variant="muted">
          No chores yet. Add chores in Tasks to see time estimates.
        </Text>
      ) : (
        <>
          <TimeCommitmentView chores={chores} />
          <FrequencyBreakdownView chores={chores} />
        </>
      )}
    </Stack>
  );
}
