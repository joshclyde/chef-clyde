import {
  BrushCleaning,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  ListTodo,
  type LucideIcon,
  Repeat2,
} from "lucide-react";
import { useState } from "react";

import { todayLocal } from "../../lib/date";
import {
  itemDisplayName,
  type ScheduleItem,
  type ScheduleItemCategory,
  useScheduleItems,
} from "../../lib/scheduleItems";
import { Button, Card, Heading, Inline, Stack, Text } from "../../ui";
import { cn } from "../../ui/cn";
import { formatTimeRange } from "./dailyTime";
import styles from "./Schedule.module.css";
import { ScheduleGenerator } from "./ScheduleGenerator";
import { type Schedule, type ScheduleTask, useSchedules } from "./useSchedules";

/** Per-category icon + style for a task's link badge. */
const CATEGORY_ICON: Record<
  ScheduleItemCategory,
  { icon: LucideIcon; className: string; label: string }
> = {
  chore: {
    icon: BrushCleaning,
    className: styles.choreIcon,
    label: "Linked to a chore",
  },
  todo: {
    icon: ListTodo,
    className: styles.todoIcon,
    label: "From your to-dos",
  },
  hobby: {
    icon: Gamepad2,
    className: styles.hobbyIcon,
    label: "From your hobbies",
  },
  routine: {
    icon: Repeat2,
    className: styles.routineIcon,
    label: "From your routines",
  },
};

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

/** The category icon for a task's linked item, or nothing when unlinked. */
function SavedLinkBadge({
  task,
  items,
}: {
  task: ScheduleTask;
  items: ScheduleItem[];
}) {
  if (!task.itemId) return null;
  const item = items.find((i) => i.id === task.itemId);
  const meta = CATEGORY_ICON[item?.category ?? "chore"];
  const Icon = meta.icon;
  const label = item ? `${meta.label}: ${itemDisplayName(item)}` : meta.label;
  return (
    <span className={meta.className} role="img" aria-label={label} title={label}>
      <Icon size={14} aria-hidden />
    </span>
  );
}

/** Read-only summary of a schedule's parsed tasks, styled by persisted status. */
function SavedTaskList({
  tasks,
  items,
}: {
  tasks: ScheduleTask[];
  items: ScheduleItem[];
}) {
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
            <SavedLinkBadge task={task} items={items} />
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
  items,
  onSave,
  onGenerate,
  previewPrompt,
  onDelete,
}: {
  schedule: Schedule;
  isToday: boolean;
  schedules: Schedule[];
  items: ScheduleItem[];
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
            <SavedTaskList tasks={schedule.tasks ?? []} items={items} />
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
  const { items } = useScheduleItems();
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
              items={items}
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
