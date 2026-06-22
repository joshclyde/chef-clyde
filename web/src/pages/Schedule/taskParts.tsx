import {
  BrushCleaning,
  Gamepad2,
  ListTodo,
  type LucideIcon,
  Repeat2,
} from "lucide-react";
import { useState } from "react";

import {
  itemDisplayName,
  type ScheduleItem,
  type ScheduleItemCategory,
} from "../../lib/scheduleItems";
import { Button, Inline, Select, Stack, Text, Textarea } from "../../ui";
import styles from "./Schedule.module.css";
import type { ScheduleTask, TaskPatch, TaskStatus } from "./useSchedules";

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
export function LinkBadge({
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
export function TaskDetail({
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
