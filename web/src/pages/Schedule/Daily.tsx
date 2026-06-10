import { useState } from "react";
import { Button, Card, Heading, Inline, Stack, Text } from "../../ui";
import { cn } from "../../ui/cn";
import { todayLocal } from "../../lib/date";
import { useSchedules, type Schedule } from "./useSchedules";
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
          <Button size="sm" onClick={generate} disabled={parsing}>
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

/** Interactive, time-aware checklist of the day's tasks. */
function TaskList({
  schedule,
  onToggle,
  onParse,
}: {
  schedule: Schedule;
  onToggle: (id: string, taskId: string, completed: boolean) => Promise<void>;
  onParse: (id: string) => Promise<Schedule>;
}) {
  const now = useNow();
  const [reparsing, setReparsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasks = schedule.tasks ?? [];
  const completed = tasks.filter((t) => t.completed).length;

  async function toggle(taskId: string, value: boolean) {
    setError(null);
    try {
      await onToggle(schedule.id, taskId, value);
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
              {completed}/{tasks.length} done
            </Text>
            <Button
              size="sm"
              variant="ghost"
              onClick={reparse}
              disabled={reparsing}
            >
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
            return (
              <label
                key={task.id}
                className={cn(styles.taskRow, styles[status])}
              >
                <input
                  type="checkbox"
                  className={styles.taskCheckbox}
                  checked={task.completed}
                  onChange={(e) => toggle(task.id, e.target.checked)}
                />
                <span className={styles.taskTime}>{formatTimeRange(task)}</span>
                <span className={styles.taskLabel}>{task.label}</span>
                {status === "current" && (
                  <span className={styles.nowBadge}>Now</span>
                )}
              </label>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function ScheduleDaily() {
  const { schedules, loading, error, parseTasks, setTaskCompleted } =
    useSchedules();
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
          onToggle={setTaskCompleted}
          onParse={parseTasks}
        />
      ) : (
        <UnparsedSchedule schedule={schedule} onParse={parseTasks} />
      )}
    </Stack>
  );
}
