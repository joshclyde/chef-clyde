import {
  BrushCleaning,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  ListTodo,
  Repeat2,
} from "lucide-react";
import { useState } from "react";

import { todayLocal } from "../../lib/date";
import { Button, Card, Heading, Inline, Stack, Text } from "../../ui";
import { cn } from "../../ui/cn";
import { formatTimeRange } from "./dailyTime";
import styles from "./Schedule.module.css";
import { ScheduleGenerator } from "./ScheduleGenerator";
import { type Schedule, type ScheduleTask, useSchedules } from "./useSchedules";

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
            {task.choreId && (
              <span
                className={styles.choreIcon}
                role="img"
                aria-label="Linked to a chore"
                title="Linked to a chore"
              >
                <BrushCleaning size={14} aria-hidden />
              </span>
            )}
            {task.todoId && (
              <span
                className={styles.todoIcon}
                role="img"
                aria-label="From your to-dos"
                title="From your to-dos"
              >
                <ListTodo size={14} aria-hidden />
              </span>
            )}
            {task.hobbyTaskId && (
              <span
                className={styles.hobbyIcon}
                role="img"
                aria-label="From your hobbies"
                title="From your hobbies"
              >
                <Gamepad2 size={14} aria-hidden />
              </span>
            )}
            {task.routineId && (
              <span
                className={styles.routineIcon}
                role="img"
                aria-label="From your routines"
                title="From your routines"
              >
                <Repeat2 size={14} aria-hidden />
              </span>
            )}
          </div>
        </div>
      ))}
    </Stack>
  );
}

/** Collapsible (closed by default) wrapper around a labeled text blob. */
function CollapsibleText({
  label,
  content,
}: {
  label: string;
  content: string;
}) {
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
        {label}
      </button>
      {open && (
        <Text className={styles.content}>
          {content || "No notes for this day."}
        </Text>
      )}
    </Stack>
  );
}

function ScheduleCard({
  schedule,
  isToday,
  schedules,
  onSave,
  onGenerate,
  previewPrompt,
  onDelete,
}: {
  schedule: Schedule;
  isToday: boolean;
  schedules: Schedule[];
  onSave: (date: string, dayContext: string) => Promise<Schedule>;
  onGenerate: (id: string) => Promise<Schedule>;
  previewPrompt: (date: string, dayContext: string) => Promise<string>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasTasks = (schedule.tasks?.length ?? 0) > 0;

  if (editing) {
    return (
      <Card className={cn(isToday && styles.todayCard)}>
        <ScheduleGenerator
          heading={formatDate(schedule.date)}
          initialDate={schedule.date}
          schedule={schedule}
          schedules={schedules}
          onSave={onSave}
          onGenerate={onGenerate}
          previewPrompt={previewPrompt}
          onClose={() => setEditing(false)}
        />
      </Card>
    );
  }

  return (
    <Card className={cn(isToday && styles.todayCard)}>
      <Stack gap="md">
        <Inline justify="between">
          <Heading level={2}>{formatDate(schedule.date)}</Heading>
          <Inline gap="2xs">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
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
        {hasTasks ? (
          <>
            <SavedTaskList tasks={schedule.tasks ?? []} />
            <CollapsibleText
              label="Day context"
              content={schedule.dayContext}
            />
          </>
        ) : (
          <Text className={styles.content}>
            {schedule.dayContext ||
              "No day context yet. Use Edit to add notes and generate a task list."}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export default function ScheduleSaved() {
  const {
    schedules,
    loading,
    error,
    createSchedule,
    deleteSchedule,
    generateTasks,
    previewPrompt,
  } = useSchedules();
  const [creating, setCreating] = useState(false);
  const today = todayLocal();

  const sorted = [...schedules].sort((a, b) => b.date.localeCompare(a.date));

  const onSave = (date: string, dayContext: string) =>
    createSchedule({ date, dayContext });

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
          <Card>
            <ScheduleGenerator
              heading="New schedule"
              initialDate={today}
              allowDateEdit
              schedules={schedules}
              onSave={onSave}
              onGenerate={generateTasks}
              previewPrompt={previewPrompt}
              onClose={() => setCreating(false)}
            />
          </Card>
        )}

        {sorted.length === 0 && !creating ? (
          <Text variant="muted">
            No saved schedules yet. Use the New schedule button to plan a day.
          </Text>
        ) : (
          sorted.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              isToday={schedule.date === today}
              schedules={schedules}
              onSave={onSave}
              onGenerate={generateTasks}
              previewPrompt={previewPrompt}
              onDelete={deleteSchedule}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
}
