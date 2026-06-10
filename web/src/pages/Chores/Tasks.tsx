import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button, Card, Heading, Inline, Input, Stack, Text } from "../../ui";
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

const COLUMN_COUNT = 8;

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

function DueCell({ chore }: { chore: Chore }) {
  const status = dueStatus(chore);
  const due = nextDue(chore);

  if (status === "never") {
    return (
      <Text size="sm" variant="strong">
        Due now
      </Text>
    );
  }
  if (status === "overdue" && due) {
    return (
      <Text size="sm" variant="danger">
        Overdue · {formatDate(due)}
      </Text>
    );
  }
  return <Text size="sm">{due ? formatDate(due) : "—"}</Text>;
}

/** A "—" placeholder for empty optional cells. */
function Empty() {
  return (
    <Text size="sm" variant="subtle">
      —
    </Text>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(id);
    }
  }

  function startEdit(id: string) {
    setEditingId(id);
    setExpandedId(id);
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
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.expandCol} aria-label="Expand" />
                <th>Chore</th>
                <th>Frequency</th>
                <th>Time</th>
                <th>Room</th>
                <th>Floor</th>
                <th>Due</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((chore) => {
                const isExpanded =
                  expandedId === chore.id || editingId === chore.id;
                const isEditing = editingId === chore.id;
                const last = lastPerformed(chore);
                const completions = [...chore.completions].sort(
                  (a, b) =>
                    new Date(b.performedAt).getTime() -
                    new Date(a.performedAt).getTime(),
                );

                return (
                  <Fragment key={chore.id}>
                    <tr className={styles.row}>
                      <td>
                        <button
                          type="button"
                          className={styles.expandButton}
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded ? "Collapse details" : "Expand details"
                          }
                          onClick={() => toggleExpand(chore.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} aria-hidden />
                          ) : (
                            <ChevronRight size={16} aria-hidden />
                          )}
                        </button>
                      </td>
                      <td className={styles.nameCell}>{chore.name}</td>
                      <td>
                        {chore.frequencyValue}{" "}
                        {unitLabel(chore.frequencyValue, chore.frequencyUnit)}
                      </td>
                      <td>
                        {chore.typicalTimeMinutes != null ? (
                          `${chore.typicalTimeMinutes}m`
                        ) : (
                          <Empty />
                        )}
                      </td>
                      <td>{chore.room ?? <Empty />}</td>
                      <td>{chore.floor ?? <Empty />}</td>
                      <td>
                        <DueCell chore={chore} />
                      </td>
                      <td className={styles.actionsCell}>
                        <Inline gap="2xs">
                          <Button
                            size="sm"
                            onClick={() => logCompletion(chore.id)}
                          >
                            Mark done
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(chore.id)}
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
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className={styles.detailRow}>
                        <td className={styles.detailCell} colSpan={COLUMN_COUNT}>
                          {isEditing ? (
                            <ChoreForm
                              initial={chore}
                              submitting={submitting}
                              onSubmit={(values) =>
                                handleUpdate(chore.id, values)
                              }
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <Stack gap="md">
                              <Text size="sm" variant="muted">
                                {last
                                  ? `Last done ${formatDate(last)}`
                                  : "Never done yet"}
                              </Text>

                              <Stack gap="3xs">
                                <Text as="label" size="xs" variant="muted">
                                  Log a past completion
                                </Text>
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
                              </Stack>

                              <Stack gap="2xs">
                                <Text size="xs" variant="subtle">
                                  History ({completions.length})
                                </Text>
                                {completions.length === 0 ? (
                                  <Text size="sm" variant="subtle">
                                    No completions logged yet.
                                  </Text>
                                ) : (
                                  <ul className={styles.historyList}>
                                    {completions.map((completion) => (
                                      <li key={completion.id}>
                                        <Inline justify="between">
                                          <Text size="sm">
                                            {formatDate(completion.performedAt)}
                                          </Text>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              deleteCompletion(
                                                chore.id,
                                                completion.id,
                                              )
                                            }
                                          >
                                            Delete
                                          </Button>
                                        </Inline>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </Stack>
                            </Stack>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
