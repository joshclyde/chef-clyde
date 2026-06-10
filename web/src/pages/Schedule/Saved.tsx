import { useState } from "react";
import { Button, Card, Heading, Inline, Input, Stack, Text, Textarea } from "../../ui";
import { useSchedules, type Schedule } from "./useSchedules";
import styles from "./Schedule.module.css";

/** Format a "YYYY-MM-DD" string as a readable local date (no TZ shift). */
function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ScheduleCard({
  schedule,
  onUpdate,
  onDelete,
}: {
  schedule: Schedule;
  onUpdate: (id: string, date: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(schedule.date);
  const [content, setContent] = useState(schedule.content);
  const [submitting, setSubmitting] = useState(false);

  function startEdit() {
    setDate(schedule.date);
    setContent(schedule.content);
    setEditing(true);
  }

  async function save() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onUpdate(schedule.id, date, content);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <Stack gap="md">
        {editing ? (
          <>
            <Input
              className={styles.dateInput}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Schedule date"
            />
            <Textarea
              className={styles.editField}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
            />
            <Inline gap="2xs">
              <Button size="sm" onClick={save} disabled={submitting || !content.trim()}>
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </Inline>
          </>
        ) : (
          <>
            <Inline justify="between">
              <Heading level={2}>{formatDate(schedule.date)}</Heading>
              <Inline gap="2xs">
                <Button size="sm" variant="ghost" onClick={startEdit}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDelete(schedule.id)}
                >
                  Delete
                </Button>
              </Inline>
            </Inline>
            <Text className={styles.content}>{schedule.content}</Text>
          </>
        )}
      </Stack>
    </Card>
  );
}

export default function ScheduleSaved() {
  const { schedules, loading, error, updateSchedule, deleteSchedule } =
    useSchedules();

  const sorted = [...schedules].sort((a, b) => b.date.localeCompare(a.date));

  async function handleUpdate(id: string, date: string, content: string) {
    await updateSchedule(id, { date, content });
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Saved schedules</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Heading level={1}>Saved schedules</Heading>
      {error && <Text variant="danger">{error}</Text>}

      {sorted.length === 0 ? (
        <Text variant="muted">
          No saved schedules yet. Generate one on the Create page and save it.
        </Text>
      ) : (
        <Stack gap="md">
          {sorted.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onUpdate={handleUpdate}
              onDelete={deleteSchedule}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
