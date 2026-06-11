import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Button, Card, Heading, Inline, Input, Stack, Text, Textarea } from "../../ui";
import { cn } from "../../ui/cn";
import { todayLocal } from "../../lib/date";
import {
  useSchedules,
  type Schedule,
  type ScheduleTask,
} from "./useSchedules";
import { formatTimeRange } from "./dailyTime";
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

/** Inline form to create a new schedule for a date. Mirrors the edit form. */
function NewScheduleCard({
  onCreate,
  onClose,
}: {
  onCreate: (date: string, content: string) => Promise<void>;
  onClose: () => void;
}) {
  const [date, setDate] = useState(todayLocal());
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(date, content);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <Stack gap="md">
        <Heading level={2}>New schedule</Heading>
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
          placeholder="Write the schedule for this day..."
        />
        <Inline gap="2xs">
          <Button size="sm" onClick={save} disabled={submitting || !content.trim()}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </Inline>
      </Stack>
    </Card>
  );
}

/** Read-only summary of a schedule's parsed tasks, styled by persisted status. */
function SavedTaskList({ tasks }: { tasks: ScheduleTask[] }) {
  const resolved = tasks.filter((t) => t.status !== "pending").length;
  return (
    <Stack gap="2xs">
      <Text variant="muted" size="sm">
        {resolved}/{tasks.length} resolved
      </Text>
      {tasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            styles.taskRow,
            task.status !== "pending" && styles[task.status],
          )}
        >
          <div className={styles.taskMain}>
            <span className={styles.taskTime}>{formatTimeRange(task)}</span>
            <span className={styles.taskLabel}>{task.label}</span>
          </div>
        </div>
      ))}
    </Stack>
  );
}

/** Collapsible (closed by default) wrapper around a schedule's raw text. */
function CollapsibleText({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="2xs">
      <button
        type="button"
        className={styles.textToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown size={16} aria-hidden />
        ) : (
          <ChevronRight size={16} aria-hidden />
        )}
        Schedule text
      </button>
      {open && <Text className={styles.content}>{content}</Text>}
    </Stack>
  );
}

function ScheduleCard({
  schedule,
  onUpdate,
  onDelete,
  onParse,
}: {
  schedule: Schedule;
  onUpdate: (id: string, date: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onParse: (id: string) => Promise<Schedule>;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(schedule.date);
  const [content, setContent] = useState(schedule.content);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const hasTasks = (schedule.tasks?.length ?? 0) > 0;

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

  async function generate() {
    setParsing(true);
    setParseError(null);
    try {
      await onParse(schedule.id);
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "Failed to generate task list",
      );
    } finally {
      setParsing(false);
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
                {!hasTasks && (
                  <Button
                    size="sm"
                    variant="ai"
                    onClick={generate}
                    disabled={parsing}
                  >
                    <Sparkles size={16} strokeWidth={2} aria-hidden />
                    {parsing ? "Generating..." : "Generate task list"}
                  </Button>
                )}
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
            {parseError && (
              <Text variant="danger" size="sm">
                {parseError}
              </Text>
            )}
            {hasTasks ? (
              <>
                <SavedTaskList tasks={schedule.tasks ?? []} />
                <CollapsibleText content={schedule.content} />
              </>
            ) : (
              <Text className={styles.content}>{schedule.content}</Text>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}

export default function ScheduleSaved() {
  const { schedules, loading, error, createSchedule, updateSchedule, deleteSchedule, parseTasks } =
    useSchedules();
  const [creating, setCreating] = useState(false);

  const sorted = [...schedules].sort((a, b) => b.date.localeCompare(a.date));

  async function handleUpdate(id: string, date: string, content: string) {
    await updateSchedule(id, { date, content });
  }

  async function handleCreate(date: string, content: string) {
    await createSchedule({ date, content });
  }

  const header = (
    <Inline justify="between">
      <Heading level={1}>Saved schedules</Heading>
      <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
        New schedule
      </Button>
    </Inline>
  );

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        {header}
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      {header}
      {error && <Text variant="danger">{error}</Text>}

      <Stack gap="md">
        {creating && (
          <NewScheduleCard
            onCreate={handleCreate}
            onClose={() => setCreating(false)}
          />
        )}

        {sorted.length === 0 && !creating ? (
          <Text variant="muted">
            No saved schedules yet. Use the New schedule button, or generate one
            in the Chat panel and save it.
          </Text>
        ) : (
          sorted.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onUpdate={handleUpdate}
              onDelete={deleteSchedule}
              onParse={parseTasks}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
}
