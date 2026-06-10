import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Heading,
  Inline,
  Input,
  Stack,
  Text,
} from "../../ui";
import { ChoreForm } from "./ChoreForm";
import {
  dueSortKey,
  dueStatus,
  lastPerformed,
  nextDue,
  useChores,
  type Chore,
  type ChoreInput,
  type FrequencyUnit,
} from "./useChores";
import styles from "./Tasks.module.css";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function unitLabel(value: number, unit: FrequencyUnit) {
  const singular = { days: "day", weeks: "week", months: "month" }[unit];
  return value === 1 ? singular : `${singular}s`;
}

function DueLine({ chore }: { chore: Chore }) {
  const status = dueStatus(chore);
  const due = nextDue(chore);
  const last = lastPerformed(chore);

  return (
    <Stack gap="3xs">
      {status === "never" && (
        <Text size="sm" variant="strong">
          Never done — due now
        </Text>
      )}
      {status === "overdue" && due && (
        <Text size="sm" variant="danger">
          Overdue · was due {formatDate(due)}
        </Text>
      )}
      {status === "upcoming" && due && (
        <Text size="sm">Next due {formatDate(due)}</Text>
      )}
      {last && (
        <Text size="xs" variant="subtle">
          Last done {formatDate(last)}
        </Text>
      )}
    </Stack>
  );
}

export default function Tasks() {
  const {
    chores,
    loading,
    error,
    createChore,
    updateChore,
    deleteChore,
    logCompletion,
    deleteCompletion,
  } = useChores();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [logDates, setLogDates] = useState<Record<string, string>>({});

  const sorted = [...chores].sort((a, b) => dueSortKey(a) - dueSortKey(b));

  async function handleCreate(values: ChoreInput) {
    setSubmitting(true);
    try {
      await createChore(values);
      setCreating(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: string, values: ChoreInput) {
    setSubmitting(true);
    try {
      await updateChore(id, values);
      setEditingId(null);
    } finally {
      setSubmitting(false);
    }
  }

  function handleLog(id: string) {
    const dateStr = logDates[id];
    if (!dateStr) return;
    const performedAt = new Date(`${dateStr}T12:00:00`).toISOString();
    logCompletion(id, performedAt);
    setLogDates((prev) => ({ ...prev, [id]: "" }));
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Chores</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Inline justify="between">
        <Heading level={1}>Chores</Heading>
        {!creating && (
          <Button onClick={() => setCreating(true)}>New chore</Button>
        )}
      </Inline>
      {error && <Text variant="danger">{error}</Text>}

      {creating && (
        <Card>
          <ChoreForm
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Card>
      )}

      {chores.length === 0 && !creating ? (
        <Text variant="muted">No chores yet. Click "New chore" to add one.</Text>
      ) : (
        <ul className={styles.list}>
          {sorted.map((chore) => (
            <li key={chore.id}>
              <Card>
                {editingId === chore.id ? (
                  <ChoreForm
                    initial={chore}
                    submitting={submitting}
                    onSubmit={(values) => handleUpdate(chore.id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <Stack gap="sm">
                    <Heading level={2}>{chore.name}</Heading>
                    <Text variant="muted" size="sm">
                      every {chore.frequencyValue}{" "}
                      {unitLabel(chore.frequencyValue, chore.frequencyUnit)}
                      {chore.typicalTimeMinutes != null
                        ? ` · ~${chore.typicalTimeMinutes}m`
                        : ""}
                    </Text>
                    {(chore.room || chore.floor) && (
                      <Inline gap="xs" wrap>
                        {chore.room && <Badge>{chore.room}</Badge>}
                        {chore.floor && <Badge>{chore.floor}</Badge>}
                      </Inline>
                    )}

                    <DueLine chore={chore} />

                    <Inline gap="sm" wrap>
                      <Button size="sm" onClick={() => logCompletion(chore.id)}>
                        Mark done
                      </Button>
                      <Inline gap="2xs">
                        <Input
                          className={styles.dateInput}
                          type="date"
                          value={logDates[chore.id] ?? ""}
                          onChange={(e) =>
                            setLogDates((prev) => ({
                              ...prev,
                              [chore.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!logDates[chore.id]}
                          onClick={() => handleLog(chore.id)}
                        >
                          Log
                        </Button>
                      </Inline>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(chore.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => deleteChore(chore.id)}
                      >
                        Delete
                      </Button>
                    </Inline>

                    <details>
                      <summary className={styles.summary}>
                        History ({chore.completions.length})
                      </summary>
                      {chore.completions.length === 0 ? (
                        <Text variant="subtle" size="sm">
                          No completions logged yet.
                        </Text>
                      ) : (
                        <ul className={styles.historyList}>
                          {[...chore.completions]
                            .sort(
                              (a, b) =>
                                new Date(b.performedAt).getTime() -
                                new Date(a.performedAt).getTime(),
                            )
                            .map((completion) => (
                              <li key={completion.id}>
                                <Inline justify="between">
                                  <Text size="sm">
                                    {formatDate(completion.performedAt)}
                                  </Text>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      deleteCompletion(chore.id, completion.id)
                                    }
                                  >
                                    Delete
                                  </Button>
                                </Inline>
                              </li>
                            ))}
                        </ul>
                      )}
                    </details>
                  </Stack>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}
