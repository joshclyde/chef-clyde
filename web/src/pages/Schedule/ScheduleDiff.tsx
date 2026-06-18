import { Stack, Text } from "../../ui";
import { cn } from "../../ui/cn";
import { formatTimeRange } from "./dailyTime";
import styles from "./Schedule.module.css";
import type { ScheduleTask } from "./useSchedules";

type DiffKind = "added" | "changed" | "removed" | "unchanged";

type DiffRow = {
  key: string;
  kind: DiffKind;
  task: ScheduleTask; // the row to display (a proposal task, or a removed current task)
  was?: ScheduleTask; // the prior version, for a changed row
};

/** Did the plan-level fields (label / start / end) differ between two tasks? */
function planChanged(a: ScheduleTask, b: ScheduleTask): boolean {
  return (
    a.label !== b.label ||
    a.startTime !== b.startTime ||
    a.endTime !== b.endTime
  );
}

/**
 * Compare the current task list with the AI's proposal and produce a single
 * chronological row list: proposal tasks tagged added / changed / unchanged,
 * with removed current tasks slotted back in at their original time.
 */
function buildDiff(
  current: ScheduleTask[],
  proposal: ScheduleTask[],
): DiffRow[] {
  const currentById = new Map(current.map((t) => [t.id, t]));
  const proposalIds = new Set(proposal.map((t) => t.id));

  const rows: DiffRow[] = [];
  for (const task of proposal) {
    const was = currentById.get(task.id);
    if (!was) {
      rows.push({ key: task.id, kind: "added", task });
    } else if (planChanged(was, task)) {
      rows.push({ key: task.id, kind: "changed", task, was });
    } else {
      rows.push({ key: task.id, kind: "unchanged", task });
    }
  }
  for (const task of current) {
    if (!proposalIds.has(task.id)) {
      rows.push({ key: task.id, kind: "removed", task });
    }
  }
  return rows.sort((a, b) => a.task.startTime.localeCompare(b.task.startTime));
}

/** A short "what changed" annotation for a modified row. */
function changeNote(row: DiffRow): string | null {
  if (row.kind !== "changed" || !row.was) return null;
  const parts: string[] = [];
  if (
    row.was.startTime !== row.task.startTime ||
    row.was.endTime !== row.task.endTime
  ) {
    parts.push(`was ${formatTimeRange(row.was)}`);
  }
  if (row.was.label !== row.task.label) {
    parts.push(`was “${row.was.label}”`);
  }
  return parts.join(" · ");
}

/**
 * Read-only unified-timeline view of an AI edit: the proposed day in
 * chronological order with new / changed rows accented and removed rows struck
 * through in place. The caller owns the accept / discard controls.
 */
export function ScheduleDiff({
  current,
  proposal,
}: {
  current: ScheduleTask[];
  proposal: ScheduleTask[];
}) {
  const rows = buildDiff(current, proposal);
  const changeCount = rows.filter((r) => r.kind !== "unchanged").length;

  if (changeCount === 0) {
    return (
      <Text size="sm" variant="muted">
        Clyde didn’t suggest any changes.
      </Text>
    );
  }

  return (
    <Stack gap="2xs">
      {rows.map((row) => {
        const note = changeNote(row);
        return (
          <div
            key={`${row.kind}-${row.key}`}
            className={cn(styles.diffRow, styles[row.kind])}
          >
            <span className={styles.diffTime}>{formatTimeRange(row.task)}</span>
            <span className={styles.diffLabel}>{row.task.label}</span>
            {note && (
              <Text size="xs" variant="muted" className={styles.diffNote}>
                {note}
              </Text>
            )}
            {row.kind === "added" && (
              <span className={cn(styles.diffBadge, styles.badgeAdded)}>
                New
              </span>
            )}
            {row.kind === "removed" && (
              <span className={cn(styles.diffBadge, styles.badgeRemoved)}>
                Removed
              </span>
            )}
          </div>
        );
      })}
    </Stack>
  );
}
