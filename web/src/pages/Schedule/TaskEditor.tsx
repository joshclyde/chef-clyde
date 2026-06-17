import { useEffect, useRef, useState } from "react";

import { Button, Inline, Input, Stack, Text } from "../../ui";
import styles from "./Schedule.module.css";
import type { NewTaskInput, ScheduleTask } from "./useSchedules";

type TaskEditorProps = {
  /** When present, the editor edits this task; when absent, it creates one. */
  initial?: ScheduleTask;
  submitting?: boolean;
  onSubmit: (values: NewTaskInput) => void;
  onCancel: () => void;
  /** Only supplied in edit mode, where deleting the task is allowed. */
  onDelete?: () => void;
};

/**
 * Inline editor for a single schedule task — its label and start/end time —
 * used both to add a new task and to edit an existing one. Native `type="time"`
 * inputs read and write the 24h "HH:MM" strings the schedule stores.
 */
export function TaskEditor({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
  onDelete,
}: TaskEditorProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");

  const labelRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  // Mirror the server's rules: a label and start time are required, and an end
  // time (optional) may not fall before the start. "HH:MM" compares chronologically.
  const valid =
    label.trim() !== "" &&
    startTime !== "" &&
    (endTime === "" || endTime >= startTime);

  function save() {
    if (!valid || submitting) return;
    onSubmit({
      label: label.trim(),
      startTime,
      endTime: endTime === "" ? null : endTime,
    });
  }

  // Enter saves and Escape cancels, matching the other inline editors.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className={styles.taskEditor}>
      <Stack gap="2xs">
        <Input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's the task?"
          aria-label="Task description"
        />
        <Inline gap="sm" justify="between" wrap>
          <Inline gap="2xs">
            <Input
              className={styles.timeInput}
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Start time"
            />
            <Text size="sm" variant="muted">
              to
            </Text>
            <Input
              className={styles.timeInput}
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="End time"
            />
          </Inline>
          <Inline gap="2xs">
            <Button size="sm" onClick={save} disabled={!valid || submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            {onDelete && (
              <Button
                size="sm"
                variant="danger"
                onClick={onDelete}
                disabled={submitting}
              >
                Delete
              </Button>
            )}
          </Inline>
        </Inline>
      </Stack>
    </div>
  );
}
