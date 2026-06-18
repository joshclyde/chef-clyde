import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button, Heading, Inline, Stack, Text, Textarea } from "../../ui";
import styles from "./Schedule.module.css";
import { ScheduleDiff } from "./ScheduleDiff";
import type { Schedule, ScheduleTask, TaskPlan } from "./useSchedules";

/**
 * "Ask Clyde to edit this schedule": the user describes a change, the AI returns
 * a proposed task list (nothing saved yet), and a diff is shown for the user to
 * accept or discard. Accepting commits the list via the replace-tasks endpoint;
 * discarding just drops the proposal.
 */
export function ScheduleAiEdit({
  schedule,
  onPreview,
  onAccept,
}: {
  schedule: Schedule;
  onPreview: (id: string, instruction: string) => Promise<ScheduleTask[]>;
  onAccept: (id: string, tasks: TaskPlan[]) => Promise<Schedule>;
}) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<null | "suggest" | "accept">(null);
  const [error, setError] = useState<string | null>(null);
  // The proposal under review plus the task snapshot it was diffed against, so
  // the diff stays stable even if the live schedule changes underneath.
  const [review, setReview] = useState<{
    proposal: ScheduleTask[];
    snapshot: ScheduleTask[];
  } | null>(null);

  async function suggest() {
    if (instruction.trim() === "") return;
    setBusy("suggest");
    setError(null);
    try {
      const proposal = await onPreview(schedule.id, instruction);
      setReview({ proposal, snapshot: schedule.tasks ?? [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to suggest changes.");
    } finally {
      setBusy(null);
    }
  }

  async function accept() {
    if (!review) return;
    setBusy("accept");
    setError(null);
    // Send an id only for rows that map to an existing task; new rows go without
    // one so the server creates them fresh.
    const snapshotIds = new Set(review.snapshot.map((t) => t.id));
    const tasks: TaskPlan[] = review.proposal.map((t) => ({
      id: snapshotIds.has(t.id) ? t.id : undefined,
      label: t.label,
      startTime: t.startTime,
      endTime: t.endTime,
    }));
    try {
      await onAccept(schedule.id, tasks);
      setReview(null);
      setInstruction("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply changes.");
    } finally {
      setBusy(null);
    }
  }

  function discard() {
    setReview(null);
    setError(null);
  }

  return (
    <Stack gap="md">
      <Heading level={2}>Ask Clyde to edit this schedule</Heading>

      {review ? (
        <Stack gap="md">
          <Text size="sm" variant="muted">
            You asked: “{instruction.trim()}”
          </Text>
          <ScheduleDiff current={review.snapshot} proposal={review.proposal} />
          {error && (
            <Text variant="danger" size="sm">
              {error}
            </Text>
          )}
          <Inline gap="2xs">
            <Button
              size="sm"
              variant="ai"
              onClick={accept}
              disabled={busy !== null}
            >
              {busy === "accept" ? "Applying..." : "Accept changes"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={discard}
              disabled={busy !== null}
            >
              Discard
            </Button>
          </Inline>
        </Stack>
      ) : (
        <Stack gap="2xs">
          <Textarea
            className={styles.editField}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder="e.g. 'add a banana in the morning, drop the gym, and give coding more time in the evening'"
          />
          {error && (
            <Text variant="danger" size="sm">
              {error}
            </Text>
          )}
          <Inline gap="2xs">
            <Button
              size="sm"
              variant="ai"
              onClick={suggest}
              disabled={busy !== null || instruction.trim() === ""}
            >
              <Sparkles size={16} strokeWidth={2} aria-hidden />
              {busy === "suggest" ? "Thinking..." : "Suggest changes"}
            </Button>
          </Inline>
        </Stack>
      )}
    </Stack>
  );
}
