import { ChevronDown, ChevronRight, Menu, Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { activityForPath } from "../../layout/activities";
import { ActivityBar } from "../../layout/ActivityBar";
import { Sidebar } from "../../layout/Sidebar";
import { todayLocal } from "../../lib/date";
import { useScheduleItems } from "../../lib/scheduleItems";
import { Button, IconButton, Stack, Text } from "../../ui";
import { cn } from "../../ui/cn";
import { formatTimeRange, taskStatus, useNow } from "./dailyTime";
import rowStyles from "./Schedule.module.css";
import { TaskEditor } from "./TaskEditor";
import { LinkBadge, TaskDetail } from "./taskParts";
import {
  currentPeriodId,
  groupTasksByPeriod,
  periodForTask,
  periodLabel,
} from "./timeOfDay";
import styles from "./Today.module.css";
import {
  type NewTaskInput,
  type ScheduleTask,
  type TaskPatch,
  useSchedules,
} from "./useSchedules";

/**
 * A left slide-in drawer that surfaces the app's `ActivityBar` + `Sidebar`,
 * which this page otherwise hides. The drawer derives the active activity from
 * the URL; selecting a destination navigates away from `/schedule/today`, which
 * swaps the standard `AppLayout` back in (see App.tsx), so the drawer unmounts.
 */
function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const activity = activityForPath(pathname);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.drawerOverlay}>
      <button
        type="button"
        className={styles.scrim}
        aria-label="Close menu"
        onClick={onClose}
      />
      {/* Selecting any destination navigates away from /schedule/today, which
          unmounts this page (and the drawer) entirely; the scrim/Escape close it
          without leaving. */}
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <ActivityBar activeActivity={activity} />
        <Sidebar activity={activity} />
      </div>
    </div>
  );
}

/** Read a boolean toggle from localStorage, persisting changes back to it. */
function usePersistentToggle(key: string) {
  const [on, setOn] = useState(() => localStorage.getItem(key) === "true");
  useEffect(() => {
    localStorage.setItem(key, String(on));
  }, [key, on]);
  return [on, setOn] as const;
}

export default function ScheduleToday() {
  const {
    schedules,
    loading,
    error,
    createSchedule,
    updateTask,
    addTask,
    deleteTask,
  } = useSchedules();
  const { items } = useScheduleItems();
  const now = useNow();
  const today = todayLocal();
  const schedule = schedules.find((s) => s.date === today);
  const scheduleId = schedule?.id;
  const tasks = schedule?.tasks ?? [];
  const periodId = currentPeriodId(now);

  const [menuOpen, setMenuOpen] = useState(false);
  // "Complex" reveals every period (past above, future below) plus editing.
  const [complex, setComplex] = usePersistentToggle("schedule-today-complex");

  // Editing state (only reachable in complex view).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // taskStatus needs each task's index within the full chronological day.
  const indexById = new Map(tasks.map((t, i) => [t.id, i] as const));

  async function update(taskId: string, patch: TaskPatch) {
    if (!scheduleId) return;
    setRowError(null);
    try {
      await updateTask(scheduleId, taskId, patch);
    } catch {
      setRowError("Failed to update task. Please try again.");
    }
  }

  async function saveEdit(taskId: string, values: NewTaskInput) {
    if (!scheduleId) return;
    setRowError(null);
    setBusyId(taskId);
    try {
      await updateTask(scheduleId, taskId, values);
      setEditingId(null);
    } catch {
      setRowError("Failed to update task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(taskId: string) {
    if (!scheduleId) return;
    setRowError(null);
    setBusyId(taskId);
    try {
      await deleteTask(scheduleId, taskId);
      setEditingId(null);
    } catch {
      setRowError("Failed to delete task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  // Add a task, creating today's schedule on the fly if the day is unplanned.
  async function addTaskRow(values: NewTaskInput) {
    setRowError(null);
    setBusyId("new");
    try {
      const target =
        schedule ?? (await createSchedule({ date: today, dayContext: "" }));
      await addTask(target.id, values);
      setCreating(false);
    } catch {
      setRowError("Failed to add task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function renderTask(task: ScheduleTask) {
    const status = taskStatus(tasks, indexById.get(task.id) ?? 0, now);

    if (complex && editingId === task.id) {
      return (
        <div key={task.id} className={rowStyles.taskRow}>
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

    const expanded = expandedId === task.id;
    return (
      <div key={task.id} className={cn(rowStyles.taskRow, rowStyles[status])}>
        <div className={rowStyles.taskMain}>
          <input
            type="checkbox"
            className={rowStyles.taskCheckbox}
            checked={task.status === "completed"}
            aria-label={`Mark "${task.label}" complete`}
            onChange={(e) =>
              update(task.id, {
                status: e.target.checked ? "completed" : "pending",
              })
            }
          />
          <span className={rowStyles.taskTime}>{formatTimeRange(task)}</span>
          <span className={rowStyles.taskLabel}>{task.label}</span>
          {complex && <LinkBadge task={task} items={items} />}
          {status === "current" && (
            <span className={rowStyles.nowBadge}>Now</span>
          )}
          {complex && (
            <>
              <button
                type="button"
                className={rowStyles.expandButton}
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
                className={rowStyles.expandButton}
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
            </>
          )}
        </div>
        {complex && expanded && (
          <TaskDetail task={task} items={items} onUpdate={update} />
        )}
      </div>
    );
  }

  const [, mm, dd] = today.split("-");
  const periodTitle = periodLabel(periodId);

  // Simple view: only the current period. Complex view: every period that has
  // tasks, plus the current one (so it can be added to even when empty).
  const currentTasks = tasks.filter((t) => periodForTask(t) === periodId);
  const groups = groupTasksByPeriod(tasks).filter(
    (g) => g.tasks.length > 0 || g.period.id === periodId,
  );

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <IconButton aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <Menu size={22} strokeWidth={2} aria-hidden />
        </IconButton>
        <div className={styles.titleBlock}>
          <h1 className={styles.period}>{periodTitle}</h1>
          <p className={styles.dateLine}>
            TODAY &ndash; {mm}/{dd}
          </p>
        </div>
        <IconButton
          aria-label="Toggle edit mode"
          aria-pressed={complex}
          onClick={() => setComplex((v) => !v)}
        >
          {complex ? (
            <X size={20} strokeWidth={2} aria-hidden />
          ) : (
            <Pencil size={20} strokeWidth={2} aria-hidden />
          )}
        </IconButton>
      </header>

      <main className={styles.body}>
        {loading ? (
          <Text variant="muted" size="sm">
            Loading...
          </Text>
        ) : (
          <Stack gap="lg">
            {error && (
              <Text variant="danger" size="sm">
                {error}
              </Text>
            )}
            {rowError && (
              <Text variant="danger" size="sm">
                {rowError}
              </Text>
            )}

            {!complex &&
              (currentTasks.length === 0 ? (
                <Text variant="muted" size="sm">
                  Nothing scheduled this {periodTitle.toLowerCase()}.
                </Text>
              ) : (
                <Stack gap="2xs">{currentTasks.map(renderTask)}</Stack>
              ))}

            {complex && (
              <>
                {groups.map((group) => (
                  <Stack key={group.period.id} gap="2xs">
                    <Text
                      as="h2"
                      size="xs"
                      className={cn(
                        styles.periodHeading,
                        group.period.id === periodId && styles.current,
                      )}
                    >
                      {group.period.label}
                    </Text>
                    {group.tasks.length === 0 ? (
                      <Text variant="muted" size="sm">
                        Nothing scheduled.
                      </Text>
                    ) : (
                      group.tasks.map(renderTask)
                    )}
                  </Stack>
                ))}

                {creating ? (
                  <div className={rowStyles.taskRow}>
                    <TaskEditor
                      submitting={busyId === "new"}
                      onSubmit={addTaskRow}
                      onCancel={() => setCreating(false)}
                    />
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCreating(true)}
                  >
                    <Plus size={16} aria-hidden /> Add task
                  </Button>
                )}
              </>
            )}
          </Stack>
        )}
      </main>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
