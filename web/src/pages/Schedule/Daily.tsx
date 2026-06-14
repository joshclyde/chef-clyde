import { useState } from "react";
import {
  BrushCleaning,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  ListTodo,
} from "lucide-react";
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
import { todayLocal } from "../../lib/date";
import { useChores, type Chore } from "../Chores/useChores";
import { useTodos, type Todo } from "../Todos/useTodos";
import { useHobbies, type Hobby } from "../Hobbies/useHobbies";
import {
  useSchedules,
  type Schedule,
  type ScheduleTask,
  type TaskPatch,
  type TaskStatus,
} from "./useSchedules";
import { ScheduleGenerator } from "./ScheduleGenerator";
import { formatTimeRange, taskStatus, useNow } from "./dailyTime";
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

/** A task's expandable detail area: free-text notes + chore/to-do links + outcome controls. */
function TaskDetail({
  task,
  chores,
  todos,
  onUpdate,
}: {
  task: ScheduleTask;
  chores: Chore[];
  todos: Todo[];
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
          Linked chore
        </Text>
        <Select
          value={task.choreId ?? ""}
          aria-label="Linked chore"
          onChange={(e) =>
            onUpdate(task.id, {
              choreId: e.target.value === "" ? null : e.target.value,
            })
          }
        >
          <option value="">No linked chore</option>
          {/* keep the select truthful while chores load or if the chore was deleted */}
          {task.choreId && !chores.some((c) => c.id === task.choreId) && (
            <option value={task.choreId}>Linked chore (unavailable)</option>
          )}
          {[...chores]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </Stack>
      <Stack gap="3xs">
        <Text as="label" size="xs" variant="muted">
          Linked to-do
        </Text>
        <Select
          value={task.todoId ?? ""}
          aria-label="Linked to-do"
          onChange={(e) =>
            onUpdate(task.id, {
              todoId: e.target.value === "" ? null : e.target.value,
            })
          }
        >
          <option value="">No linked to-do</option>
          {/* keep the select truthful if the to-do was completed or deleted */}
          {task.todoId && !todos.some((t) => t.id === task.todoId) && (
            <option value={task.todoId}>Linked to-do (unavailable)</option>
          )}
          {[...todos]
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
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
  chores,
  todos,
  hobbies,
  onUpdate,
}: {
  schedule: Schedule;
  chores: Chore[];
  todos: Todo[];
  hobbies: Hobby[];
  onUpdate: (id: string, taskId: string, patch: TaskPatch) => Promise<void>;
}) {
  const now = useNow();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tasks = schedule.tasks ?? [];
  // A task is "resolved" once the user gives it any terminal outcome.
  const resolved = tasks.filter((t) => t.status !== "pending").length;

  async function update(taskId: string, patch: TaskPatch) {
    setError(null);
    try {
      await onUpdate(schedule.id, taskId, patch);
    } catch {
      setError("Failed to update task. Please try again.");
    }
  }

  return (
    <Card>
      <Stack gap="md">
        <Inline justify="between">
          <Heading level={2}>Today's schedule</Heading>
          <Text variant="muted" size="sm">
            {resolved}/{tasks.length} resolved
          </Text>
        </Inline>
        {error && (
          <Text variant="danger" size="sm">
            {error}
          </Text>
        )}
        <Stack gap="2xs">
          {tasks.map((task, i) => {
            const status = taskStatus(tasks, i, now);
            const expanded = expandedId === task.id;
            return (
              <div
                key={task.id}
                className={cn(styles.taskRow, styles[status])}
              >
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
                  {task.choreId && (() => {
                    const chore = chores.find((c) => c.id === task.choreId);
                    const label = chore
                      ? `Linked chore: ${chore.name}`
                      : "Linked chore";
                    return (
                      <span
                        className={styles.choreIcon}
                        role="img"
                        aria-label={label}
                        title={label}
                      >
                        <BrushCleaning size={16} aria-hidden />
                      </span>
                    );
                  })()}
                  {task.todoId && (() => {
                    const todo = todos.find((t) => t.id === task.todoId);
                    const label = todo
                      ? `From your to-dos: ${todo.title}`
                      : "From your to-dos";
                    return (
                      <span
                        className={styles.todoIcon}
                        role="img"
                        aria-label={label}
                        title={label}
                      >
                        <ListTodo size={16} aria-hidden />
                      </span>
                    );
                  })()}
                  {task.hobbyTaskId && (() => {
                    const hobby = hobbies.find((h) =>
                      h.tasks.some((t) => t.id === task.hobbyTaskId),
                    );
                    const hobbyTask = hobby?.tasks.find(
                      (t) => t.id === task.hobbyTaskId,
                    );
                    const label =
                      hobby && hobbyTask
                        ? `From your hobbies: ${hobby.name} — ${hobbyTask.label}`
                        : "From your hobbies";
                    return (
                      <span
                        className={styles.hobbyIcon}
                        role="img"
                        aria-label={label}
                        title={label}
                      >
                        <Gamepad2 size={16} aria-hidden />
                      </span>
                    );
                  })()}
                  {status === "current" && (
                    <span className={styles.nowBadge}>Now</span>
                  )}
                  <button
                    type="button"
                    className={styles.expandButton}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse task" : "Expand task"}
                    onClick={() =>
                      setExpandedId(expanded ? null : task.id)
                    }
                  >
                    {expanded ? (
                      <ChevronDown size={18} aria-hidden />
                    ) : (
                      <ChevronRight size={18} aria-hidden />
                    )}
                  </button>
                </div>
                {expanded && (
                  <TaskDetail
                    task={task}
                    chores={chores}
                    todos={todos}
                    onUpdate={update}
                  />
                )}
              </div>
            );
          })}
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
    updateTask,
  } = useSchedules();
  const { chores } = useChores();
  const { todos } = useTodos();
  const { hobbies } = useHobbies();
  const today = todayLocal();
  const schedule = schedules.find((s) => s.date === today);
  const hasTasks = (schedule?.tasks?.length ?? 0) > 0;

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

      {hasTasks && schedule && (
        <TaskList
          schedule={schedule}
          chores={chores}
          todos={todos}
          hobbies={hobbies}
          onUpdate={updateTask}
        />
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
