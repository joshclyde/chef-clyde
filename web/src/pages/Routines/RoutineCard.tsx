import { Check, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge, Button, Card, Inline, Stack, Text } from "../../ui";
import { describeOccurrence, parseLocalDate, shortDate } from "./occurrence";
import { RoutineEditor } from "./RoutineEditor";
import styles from "./Routines.module.css";
import { dueStatus, type Routine, type RoutineInput } from "./useRoutines";

/** Readiness badge for cadence routines; nothing for weekly ones. */
function ReadinessBadge({ routine }: { routine: Routine }) {
  const status = dueStatus(routine);
  if (status === null) return null;
  if (status === "never")
    return <Badge className={styles.dueNow}>Due now</Badge>;
  if (status === "overdue")
    return <Badge className={styles.overdue}>Overdue</Badge>;
  return <Badge className={styles.upcoming}>Upcoming</Badge>;
}

type RoutineCardProps = {
  routine: Routine;
  onUpdate: (id: string, input: RoutineInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLog: (id: string) => Promise<void>;
  onDeleteCompletion: (id: string, completionId: string) => Promise<void>;
};

export function RoutineCard({
  routine,
  onUpdate,
  onDelete,
  onLog,
  onDeleteCompletion,
}: RoutineCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveEdit(input: RoutineInput) {
    setBusy(true);
    try {
      await onUpdate(routine.id, input);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card className={styles.routineCard}>
        <RoutineEditor
          initial={routine}
          submitting={busy}
          onSubmit={saveEdit}
          onCancel={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <Card className={styles.routineCard}>
      <Inline justify="between" align="start" gap="sm">
        <Stack gap="3xs">
          <Inline gap="2xs" wrap>
            <Text size="sm" variant="strong">
              {routine.label}
            </Text>
            <Badge className={styles[routine.timeOfDay]}>
              {routine.timeOfDay}
            </Badge>
            <ReadinessBadge routine={routine} />
          </Inline>
          <Inline gap="2xs" wrap>
            <Text size="xs" variant="muted">
              {describeOccurrence(routine)}
            </Text>
            {routine.typicalTimeMinutes != null && (
              <Text size="xs" variant="subtle">
                · {routine.typicalTimeMinutes} min
              </Text>
            )}
            {routine.completions.length > 0 && (
              <button
                type="button"
                className={styles.historyToggle}
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <ChevronDown size={13} aria-hidden />
                ) : (
                  <ChevronRight size={13} aria-hidden />
                )}
                {routine.completions.length} done
              </button>
            )}
          </Inline>
        </Stack>
        <Inline gap="2xs">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onLog(routine.id)}
          >
            <Check size={14} aria-hidden /> Log
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={styles.iconButton}
            onClick={() => setEditing(true)}
            aria-label="Edit routine"
          >
            <Pencil size={15} aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={styles.iconButton}
            onClick={() => onDelete(routine.id)}
            aria-label="Delete routine"
          >
            <Trash2 size={15} aria-hidden />
          </Button>
        </Inline>
      </Inline>

      {expanded && (
        <Stack gap="3xs" className={styles.history}>
          {[...routine.completions]
            .sort(
              (a, b) =>
                new Date(b.performedAt).getTime() -
                new Date(a.performedAt).getTime(),
            )
            .map((c) => (
              <Inline key={c.id} justify="between">
                <Text size="xs" variant="muted">
                  {shortDate(parseLocalDate(c.performedAt.slice(0, 10)))}
                </Text>
                <button
                  type="button"
                  className={styles.removeCompletion}
                  onClick={() => onDeleteCompletion(routine.id, c.id)}
                  aria-label="Remove completion"
                >
                  <Trash2 size={12} aria-hidden />
                </button>
              </Inline>
            ))}
        </Stack>
      )}
    </Card>
  );
}
