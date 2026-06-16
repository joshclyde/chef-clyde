import { useMemo } from "react";

import { Card, Heading, Stack, Text } from "../../ui";
import styles from "./Dashboard.module.css";
import { formatMinutes, weeklyTimeCommitment } from "./hobbyStats";
import {
  describeOccurrence,
  localIsoDate,
  mondayOf,
  parseLocalDate,
  shortDate,
  weekDates,
  weekdayOf,
} from "./occurrence";
import {
  dueSortKey,
  dueStatus,
  type Hobby,
  type HobbyTask,
  nextDue,
  useHobbies,
} from "./useHobbies";

type TaskRef = { hobby: Hobby; task: HobbyTask };

function eventStart(task: HobbyTask): string {
  const occ = task.occurrence;
  return occ.kind === "event" && occ.startTime ? occ.startTime : "";
}

/** A small labeled section with a fallback when it has no items. */
function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children);
  return (
    <Stack gap="2xs">
      <Heading level={2}>{title}</Heading>
      {hasChildren ? (
        children
      ) : (
        <Text size="sm" variant="muted">
          {empty}
        </Text>
      )}
    </Stack>
  );
}

function Row({
  primary,
  secondary,
  trailing,
}: {
  primary: string;
  secondary?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <Stack gap="3xs">
        <Text size="sm" variant="strong">
          {primary}
        </Text>
        {secondary && (
          <Text size="xs" variant="muted">
            {secondary}
          </Text>
        )}
      </Stack>
      {trailing}
    </div>
  );
}

export default function Dashboard() {
  const { hobbies, loading, error } = useHobbies();

  const allTasks: TaskRef[] = useMemo(
    () => hobbies.flatMap((h) => h.tasks.map((task) => ({ hobby: h, task }))),
    [hobbies],
  );

  const today = localIsoDate(new Date());
  const week = useMemo(() => weekDates(mondayOf(new Date())), []);

  const upcomingEvents = useMemo(
    () =>
      allTasks
        .filter(
          (r) =>
            r.task.occurrence.kind === "event" &&
            (r.task.occurrence as { date: string }).date >= today,
        )
        .sort((a, b) => {
          const ao = a.task.occurrence as { date: string };
          const bo = b.task.occurrence as { date: string };
          return (
            ao.date.localeCompare(bo.date) ||
            eventStart(a.task).localeCompare(eventStart(b.task))
          );
        }),
    [allTasks, today],
  );

  const cadenceTasks = useMemo(
    () =>
      allTasks
        .filter((r) => r.task.occurrence.kind === "frequency")
        .sort((a, b) => dueSortKey(a.task) - dueSortKey(b.task)),
    [allTasks],
  );

  const weeklyTasks = useMemo(
    () => allTasks.filter((r) => r.task.occurrence.kind === "weekly"),
    [allTasks],
  );

  const looseIdeas = useMemo(
    () =>
      allTasks.filter(
        (r) =>
          r.task.occurrence.kind === "oneoff" &&
          r.task.completions.length === 0,
      ),
    [allTasks],
  );

  const commitment = useMemo(() => weeklyTimeCommitment(hobbies), [hobbies]);

  function gridItems(date: Date) {
    const iso = localIsoDate(date);
    const wd = weekdayOf(date);
    const items: { key: string; text: string; hobby: string; kind: string }[] =
      [];
    for (const { hobby, task } of allTasks) {
      const occ = task.occurrence;
      if (occ.kind === "event" && occ.date === iso) {
        const t = occ.startTime ? ` · ${occ.startTime}` : "";
        items.push({
          key: task.id,
          text: `${task.label}${t}`,
          hobby: hobby.name,
          kind: "event",
        });
      } else if (occ.kind === "weekly" && occ.days.includes(wd)) {
        const t =
          occ.timeOfDay && occ.timeOfDay !== "any" ? ` · ${occ.timeOfDay}` : "";
        items.push({
          key: task.id,
          text: `${task.label}${t}`,
          hobby: hobby.name,
          kind: "weekly",
        });
      } else if (occ.kind === "frequency") {
        const due = nextDue(task) ?? new Date();
        if (localIsoDate(due) === iso) {
          items.push({
            key: task.id,
            text: `${task.label} (due)`,
            hobby: hobby.name,
            kind: "frequency",
          });
        }
      }
    }
    return items;
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Hobbies Dashboard</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Hobbies Dashboard</Heading>
        <Text variant="danger">{error}</Text>
      </Stack>
    );
  }

  const noTasks = allTasks.length === 0;

  return (
    <Stack gap="xl" className={styles.page}>
      <Heading level={1}>Hobbies Dashboard</Heading>

      {noTasks ? (
        <Text variant="muted">
          No hobby tasks yet. Add hobbies and tasks to see your week here.
        </Text>
      ) : (
        <>
          <Card className={styles.statCard}>
            <Text size="xs" variant="muted">
              Recurring time this week
            </Text>
            <Heading level={2}>
              {formatMinutes(commitment.minutesPerWeek)}
            </Heading>
            <Text size="xs" variant="subtle">
              across {commitment.includedCount} recurring task
              {commitment.includedCount === 1 ? "" : "s"}
              {commitment.excludedCount > 0
                ? ` · ${commitment.excludedCount} without a duration`
                : ""}
            </Text>
          </Card>

          <Section
            title="Upcoming events"
            empty="No scheduled events coming up."
          >
            {upcomingEvents.map(({ hobby, task }) => {
              const occ = task.occurrence as {
                date: string;
                startTime?: string;
                endTime?: string;
              };
              const time =
                occ.startTime && occ.endTime
                  ? `${occ.startTime}–${occ.endTime}`
                  : (occ.startTime ?? "");
              return (
                <Row
                  key={task.id}
                  primary={`${hobby.name} — ${task.label}`}
                  secondary={shortDate(parseLocalDate(occ.date))}
                  trailing={
                    time ? (
                      <Text size="sm" variant="muted">
                        {time}
                      </Text>
                    ) : undefined
                  }
                />
              );
            })}
          </Section>

          <Section
            title="Cadence readiness"
            empty="No cadence-based tasks yet."
          >
            {cadenceTasks.map(({ hobby, task }) => {
              const status = dueStatus(task);
              const due = nextDue(task);
              const label =
                status === "never"
                  ? "Due now"
                  : status === "overdue"
                    ? "Overdue"
                    : due
                      ? `Due ${shortDate(due)}`
                      : "";
              return (
                <Row
                  key={task.id}
                  primary={`${hobby.name} — ${task.label}`}
                  secondary={describeOccurrence(task)}
                  trailing={
                    <Text
                      size="xs"
                      variant={status === "overdue" ? "danger" : "muted"}
                    >
                      {label}
                    </Text>
                  }
                />
              );
            })}
          </Section>

          <Section title="Weekly recurring" empty="No weekly tasks yet.">
            {weeklyTasks.map(({ hobby, task }) => (
              <Row
                key={task.id}
                primary={`${hobby.name} — ${task.label}`}
                secondary={describeOccurrence(task)}
              />
            ))}
          </Section>

          <Section title="Loose ideas" empty="No loose one-off ideas.">
            {looseIdeas.map(({ hobby, task }) => (
              <Row
                key={task.id}
                primary={`${hobby.name} — ${task.label}`}
                secondary="Whenever there's room"
              />
            ))}
          </Section>

          <Stack gap="2xs">
            <Heading level={2}>This week</Heading>
            <div className={styles.grid}>
              {week.map((date) => {
                const items = gridItems(date);
                const isToday = localIsoDate(date) === today;
                return (
                  <div
                    key={date.toISOString()}
                    className={`${styles.gridDay} ${isToday ? styles.gridToday : ""}`}
                  >
                    <Text size="xs" variant={isToday ? "strong" : "muted"}>
                      {weekdayOf(date)} {date.getDate()}
                    </Text>
                    <Stack gap="3xs" className={styles.gridItems}>
                      {items.map((item) => (
                        <span
                          key={item.key}
                          className={`${styles.chip} ${styles[item.kind]}`}
                          title={item.hobby}
                        >
                          {item.text}
                        </span>
                      ))}
                    </Stack>
                  </div>
                );
              })}
            </div>
          </Stack>
        </>
      )}
    </Stack>
  );
}
