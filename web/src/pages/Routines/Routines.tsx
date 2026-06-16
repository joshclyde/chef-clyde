import { Plus } from "lucide-react";
import { useState } from "react";

import { Button, Heading, Inline, Stack, Text } from "../../ui";
import { DAY_PART_LABEL, DAY_PARTS } from "./constants";
import { RoutineCard } from "./RoutineCard";
import { RoutineEditor } from "./RoutineEditor";
import styles from "./Routines.module.css";
import { type TimeOfDay, useRoutines } from "./useRoutines";

// Lay the manage list out in clock order, with "any" trailing at the end.
const SECTIONS: TimeOfDay[] = [...DAY_PARTS, "any"];

export default function Routines() {
  const {
    routines,
    loading,
    error,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    logCompletion,
    deleteCompletion,
  } = useRoutines();

  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function create(input: Parameters<typeof createRoutine>[0]) {
    setSubmitting(true);
    try {
      await createRoutine(input);
      setAdding(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Routines</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Stack gap="2xs">
        <Heading level={1}>Routines</Heading>
        <Text variant="muted">
          The small repeating things that shape your day — brushing teeth,
          making coffee, winding down. Tag each with a time of day and the
          breakdown will sketch your typical day.
        </Text>
      </Stack>

      {error && <Text variant="danger">{error}</Text>}

      {adding ? (
        <RoutineEditor
          submitting={submitting}
          onSubmit={create}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Inline>
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden /> New routine
          </Button>
        </Inline>
      )}

      {routines.length === 0 ? (
        <Text variant="muted">No routines yet. Add one to get started.</Text>
      ) : (
        <Stack gap="lg">
          {SECTIONS.map((part) => {
            const inPart = routines.filter((r) => r.timeOfDay === part);
            if (inPart.length === 0) return null;
            return (
              <Stack gap="2xs" key={part}>
                <Heading level={2}>{DAY_PART_LABEL[part]}</Heading>
                <Stack gap="2xs">
                  {inPart.map((routine) => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      onUpdate={updateRoutine}
                      onDelete={deleteRoutine}
                      onLog={logCompletion}
                      onDeleteCompletion={deleteCompletion}
                    />
                  ))}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
