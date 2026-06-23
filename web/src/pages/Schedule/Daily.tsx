import {
  BrushCleaning,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  ListTodo,
  type LucideIcon,
  Pencil,
  Repeat2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { todayLocal } from "../../lib/date";
import {
  itemDisplayName,
  type ScheduleItem,
  type ScheduleItemCategory,
  useScheduleItems,
} from "../../lib/scheduleItems";
import {
  Button,
  Card,
  Heading,
  Inline,
  Select,
  Stack,
  Text,
  Textarea,
} from "../../ui";
import { cn } from "../../ui/cn";
import { formatTimeRange, taskStatus, useNow } from "./dailyTime";
import styles from "./Schedule.module.css";
import { ScheduleAiEdit } from "./ScheduleAiEdit";
import { ScheduleGenerator } from "./ScheduleGenerator";
import { TaskEditor } from "./TaskEditor";
import {
  type NewTaskInput,
  type Schedule,
  type ScheduleTask,
  type TaskPatch,
  type TaskStatus,
  useSchedules,
} from "./useSchedules";

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

/** Per-category presentation for the link icon + the picker's option groups. */
const CATEGORY_META: Record<
  ScheduleItemCategory,
  { icon: LucideIcon; className: string; label: string; group: string }
> = {
  chore: {
    icon: BrushCleaning,
    className: styles.choreIcon,
    label: "Linked chore",
    group: "Chores",
  },
  todo: {
    icon: ListTodo,
    className: styles.todoIcon,
    label: "From your to-dos",
    group: "To-dos",
  },
  hobby: {
    icon: Gamepad2,
    className: styles.hobbyIcon,
    label: "From your hobbies",
    group: "Hobbies",
  },
  routine: {
    icon: Repeat2,
    className: styles.routineIcon,
    label: "From your routines",
    group: "Routines",
  },
};

const LINK_CATEGORIES: ScheduleItemCategory[] = [
  "chore",
  "todo",
  "hobby",
  "routine",
];

/** The link icon shown beside a task that performs one of the user's items. */
function LinkBadge({
  task,
  items,
}: {
  task: ScheduleTask;
  items: ScheduleItem[];
}) {
  if (!task.itemId) return null;
  const item = items.find((i) => i.id === task.itemId);
  const meta = CATEGORY_META[item?.category ?? "chore"];
  const Icon = meta.icon;
  const label = item ? `${meta.label}: ${itemDisplayName(item)}` : meta.label;
  return (
    <span
      className={meta.className}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon size={16} aria-hidden />
    </span>
  );
}

/** A task's expandable detail area: free-text notes + item link + outcome controls. */
function TaskDetail({
  task,
  items,
  onUpdate,
}: {
  task: ScheduleTask;
  items: ScheduleItem[];
  onUpdate: (taskId: string, patch: TaskPatch) => void;
}) {
  // Local draft so typing stays smooth; we persist on blur.
  const [notes, setNotes] = useState(task.notes ?? "");

  function saveNotes() {
    if (notes === (task.notes ?? "")) return; // nothing changed
    onUpdate(task.id, { notes });
  }

  // Clicking the active outcome again clears it back to pending.
  function setStatus(next: Exclude<TaskStatus, "pending">) {
    onUpdate(task.id, { status: task.status === next ? "pending" : next });
  }

  return (
    <div className={styles.taskDetail}>
      <Stack gap="3xs">
        <Text as="label" size="xs" variant="muted">
          Notes
        </Text>
        <Textarea
          rows={3}
          placeholder="Add any notes for this task..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
        />
      </Stack>
      <Stack gap="3xs">
        <Text as="label" size="xs" variant="muted">
          Linked item
        </Text>
        <Select
          value={task.itemId ?? ""}
          aria-label="Linked item"
          onChange={(e) =>
            onUpdate(task.id, {
              itemId: e.target.value === "" ? null : e.target.value,
            })
          }
        >
          <option value="">No linked item</option>
          {/* keep the select truthful while items load or if the item was deleted */}
          {task.itemId && !items.some((i) => i.id === task.itemId) && (
            <option value={task.itemId}>Linked item (unavailable)</option>
          )}
          {LINK_CATEGORIES.map((category) => {
            const group = items
              .filter((i) => i.category === category)
              .sort((a, b) =>
                itemDisplayName(a).localeCompare(itemDisplayName(b)),
              );
            if (group.length === 0) return null;
            return (
              <optgroup key={category} label={CATEGORY_META[category].group}>
                {group.map((i) => (
                  <option key={i.id} value={i.id}>
                    {itemDisplayName(i)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
      </Stack>
      <Inline gap="2xs">
        <Button
          size="sm"
          variant={task.status === "future" ? "primary" : "secondary"}
          onClick={() => setStatus("future")}
        >
          Future
        </Button>
        <Button
          size="sm"
          variant={task.status === "wontDo" ? "danger" : "secondary"}
          onClick={() => setStatus("wontDo")}
        >
          Won't do
        </Button>
      </Inline>
    </div>
  );
}

/** Interactive, time-aware checklist of the day's tasks. */
function TaskList({
  schedule,
  items,
  onUpdate,
  onAddTask,
  onDeleteTask,
}: {
  schedule: Schedule | undefined;
  items: ScheduleItem[];
  onUpdate: (id: string, taskId: string, patch: TaskPatch) => Promise<void>;
  onAddTask: (input: NewTaskInput) => Promise<void>;
  onDeleteTask: (id: string, taskId: string) => Promise<void>;
}) {
  const now = useNow();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // The task id (or "new") currently saving, so its editor can show progress.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // When on, hide tasks the user has already resolved and show only pending ones.
  const [onlyUnresolved, setOnlyUnresolved] = useState(
    () => localStorage.getItem("schedule-daily-only-unresolved") === "true",
  );
  useEffect(() => {
    localStorage.setItem(
      "schedule-daily-only-unresolved",
      String(onlyUnresolved),
    );
  }, [onlyUnresolved]);
  const scheduleId = schedule?.id;
  const tasks = schedule?.tasks ?? [];
  // A task is "resolved" once the user gives it any terminal outcome.
  const resolved = tasks.filter((t) => t.status !== "pending").length;
  const allResolved = tasks.length > 0 && resolved === tasks.length;

  async function update(taskId: string, patch: TaskPatch) {
    if (!scheduleId) return;
    setError(null);
    try {
      await onUpdate(scheduleId, taskId, patch);
    } catch {
      setError("Failed to update task. Please try again.");
    }
  }

  // Persist a label/time edit from the inline editor, closing it on success.
  async function saveEdit(taskId: string, values: NewTaskInput) {
    if (!scheduleId) return;
    setError(null);
    setBusyId(taskId);
    try {
      await onUpdate(scheduleId, taskId, values);
      setEditingId(null);
    } catch {
      setError("Failed to update task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(taskId: string) {
    if (!scheduleId) return;
    setError(null);
    setBusyId(taskId);
    try {
      await onDeleteTask(scheduleId, taskId);
      setEditingId(null);
    } catch {
      setError("Failed to delete task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  // Add a task. The parent creates today's schedule first if none exists yet.
  async function addTask(values: NewTaskInput) {
    setError(null);
    setBusyId("new");
    try {
      await onAddTask(values);
      setCreating(false);
    } catch {
      setError("Failed to add task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Stack gap="md">
        <Inline justify="between">
          <Heading level={2}>Today's schedule</Heading>
          <Inline gap="sm">
            {tasks.length > 0 && (
              <Text variant="muted" size="sm">
                {resolved}/{tasks.length} resolved
              </Text>
            )}
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              disabled={creating}
            >
              New task
            </Button>
            <Button
              size="sm"
              variant={onlyUnresolved ? "primary" : "secondary"}
              aria-pressed={onlyUnresolved}
              onClick={() => setOnlyUnresolved((v) => !v)}
            >
              Only unresolved
            </Button>
          </Inline>
        </Inline>
        {error && (
          <Text variant="danger" size="sm">
            {error}
          </Text>
        )}
        <Stack gap="2xs">
          {tasks.length === 0 && !creating && (
            <Text variant="muted" size="sm">
              No tasks yet — add one with the New task button, or generate a
              plan below.
            </Text>
          )}
          {onlyUnresolved && allResolved && (
            <Text variant="muted" size="sm">
              No unresolved tasks — everything's resolved for today.
            </Text>
          )}
          {tasks.map((task, i) => {
            // Filter by rendering, not by slicing the array, so the original
            // index still feeds taskStatus its full chronological context.
            if (onlyUnresolved && task.status !== "pending") return null;
            const status = taskStatus(tasks, i, now);
            const expanded = expandedId === task.id;
            if (editingId === task.id) {
              return (
                <div key={task.id} className={styles.taskRow}>
                  <TaskEditor
                    initial={task}
                    submitting={busyId === task.id}
                    onSubmit={(values) => saveEdit(task.id, values)}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => removeTask(task.id)}
                  />
                </div>
              );
            }
            return (
              <div key={task.id} className={cn(styles.taskRow, styles[status])}>
                <div className={styles.taskMain}>
                  <input
                    type="checkbox"
                    className={styles.taskCheckbox}
                    checked={task.status === "completed"}
                    aria-label={`Mark "${task.label}" complete`}
                    onChange={(e) =>
                      update(task.id, {
                        status: e.target.checked ? "completed" : "pending",
                      })
                    }
                  />
                  <span className={styles.taskTime}>
                    {formatTimeRange(task)}
                  </span>
                  <span className={styles.taskLabel}>{task.label}</span>
                  <LinkBadge task={task} items={items} />
                  {status === "current" && (
                    <span className={styles.nowBadge}>Now</span>
                  )}
                  <button
                    type="button"
                    className={styles.expandButton}
                    aria-label="Edit task"
                    onClick={() => {
                      setEditingId(task.id);
                      setExpandedId(null);
                    }}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={styles.expandButton}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse task" : "Expand task"}
                    onClick={() => setExpandedId(expanded ? null : task.id)}
                  >
                    {expanded ? (
                      <ChevronDown size={18} aria-hidden />
                    ) : (
                      <ChevronRight size={18} aria-hidden />
                    )}
                  </button>
                </div>
                {expanded && (
                  <TaskDetail task={task} items={items} onUpdate={update} />
                )}
              </div>
            );
          })}
          {creating && (
            <div className={styles.taskRow}>
              <TaskEditor
                submitting={busyId === "new"}
                onSubmit={addTask}
                onCancel={() => setCreating(false)}
              />
            </div>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function ScheduleDaily() {
  const {
    schedules,
    loading,
    error,
    createSchedule,
    generateTasks,
    previewPrompt,
    editPreview,
    replaceTasks,
    updateTask,
    addTask,
    deleteTask,
  } = useSchedules();
  const { items } = useScheduleItems();
  const today = todayLocal();
  const schedule = schedules.find((s) => s.date === today);
  const hasTasks = (schedule?.tasks?.length ?? 0) > 0;

  // Adding a task needs a schedule to attach to; create today's on the fly the
  // first time if the user hasn't planned the day yet.
  async function handleAddTask(input: NewTaskInput) {
    const target =
      schedule ?? (await createSchedule({ date: today, dayContext: "" }));
    await addTask(target.id, input);
  }

  const header = (
    <Stack gap="2xs">
      <Heading level={1}>Today</Heading>
      <Text variant="muted">{formatDate(today)}</Text>
    </Stack>
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

      <TaskList
        schedule={schedule}
        items={items}
        onUpdate={updateTask}
        onAddTask={handleAddTask}
        onDeleteTask={deleteTask}
      />

      {schedule && hasTasks && (
        <Card>
          <ScheduleAiEdit
            schedule={schedule}
            onPreview={editPreview}
            onAccept={replaceTasks}
          />
        </Card>
      )}

      <Card>
        <ScheduleGenerator
          heading={hasTasks ? "Day context & inputs" : "Plan today"}
          initialDate={today}
          schedule={schedule}
          schedules={schedules}
          onSave={(date, dayContext) => createSchedule({ date, dayContext })}
          onGenerate={generateTasks}
          previewPrompt={previewPrompt}
        />
      </Card>
    </Stack>
  );
}
