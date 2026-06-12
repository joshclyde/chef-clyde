import { useState } from "react";
import { BrushCleaning, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
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
import {
  useSchedules,
  type Schedule,
  type ScheduleTask,
  type TaskPatch,
  type TaskStatus,
} from "./useSchedules";
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

/** Schedule exists but hasn't been parsed: show the raw text + a parse button. */
function UnparsedSchedule({
  schedule,
  onParse,
}: {
  schedule: Schedule;
  onParse: (id: string) => Promise<Schedule>;
}) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setParsing(true);
    setError(null);
    try {
      await onParse(schedule.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate task list");
    } finally {
      setParsing(false);
    }
  }

  return (
    <Card>
      <Stack gap="md">
        <Inline justify="between">
          <Heading level={2}>Today's schedule</Heading>
          <Button
            size="sm"
            variant="ai"
            onClick={generate}
            disabled={parsing}
          >
            <Sparkles size={16} strokeWidth={2} aria-hidden />
            {parsing ? "Generating..." : "Generate task list"}
          </Button>
        </Inline>
        {error && (
          <Text variant="danger" size="sm">
            {error}
          </Text>
        )}
        <Text className={styles.content}>{schedule.content}</Text>
      </Stack>
    </Card>
  );
}

/** A task's expandable detail area: free-text notes + chore link + outcome controls. */
function TaskDetail({
  task,
  chores,
  onUpdate,
}: {
  task: ScheduleTask;
  chores: Chore[];
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
  onUpdate,
  onParse,
}: {
  schedule: Schedule;
  chores: Chore[];
  onUpdate: (id: string, taskId: string, patch: TaskPatch) => Promise<void>;
  onParse: (id: string) => Promise<Schedule>;
}) {
  const now = useNow();
  const [reparsing, setReparsing] = useState(false);
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

  async function reparse() {
    setReparsing(true);
    setError(null);
    try {
      await onParse(schedule.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate tasks");
    } finally {
      setReparsing(false);
    }
  }

  return (
    <Card>
      <Stack gap="md">
        <Inline justify="between">
          <Heading level={2}>Today's schedule</Heading>
          <Inline gap="sm">
            <Text variant="muted" size="sm">
              {resolved}/{tasks.length} resolved
            </Text>
            <Button
              size="sm"
              variant="ai"
              onClick={reparse}
              disabled={reparsing}
            >
              <Sparkles size={16} strokeWidth={2} aria-hidden />
              {reparsing ? "Regenerating..." : "Re-generate"}
            </Button>
          </Inline>
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
                  <TaskDetail task={task} chores={chores} onUpdate={update} />
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
  const { schedules, loading, error, parseTasks, updateTask } = useSchedules();
  const { chores } = useChores();
  const today = todayLocal();
  const schedule = schedules.find((s) => s.date === today);

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

      {!schedule ? (
        <Card>
          <Stack gap="xs">
            <Heading level={2}>No schedule for today</Heading>
            <Text variant="muted">
              Generate a schedule in the Chat panel and save it for today to see
              it here as an interactive checklist.
            </Text>
          </Stack>
        </Card>
      ) : schedule.tasks && schedule.tasks.length > 0 ? (
        <TaskList
          schedule={schedule}
          chores={chores}
          onUpdate={updateTask}
          onParse={parseTasks}
        />
      ) : (
        <UnparsedSchedule schedule={schedule} onParse={parseTasks} />
      )}
    </Stack>
  );
}
