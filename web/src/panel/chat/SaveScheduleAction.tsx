import { useState } from "react";
import { Button, Inline, Input, Text } from "../../ui";
import { type Message } from "./types";
import styles from "./Chat.module.css";

/** Today's date as a local "YYYY-MM-DD" string (en-CA formats this way). */
function todayLocal() {
  return new Date().toLocaleDateString("en-CA");
}

/** Date picker + "Save schedule" action for the Schedule chat. */
export function SaveScheduleAction({ messages }: { messages: Message[] }) {
  const [date, setDate] = useState(todayLocal());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ overwrote: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** The most recent assistant message — the schedule to save. */
  const latestSchedule =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;
  if (!latestSchedule) return null;

  const save = () => {
    if (saving || !latestSchedule) return;
    setSaving(true);
    setSaved(null);
    setError(null);

    fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, content: latestSchedule }),
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((d) => Promise.reject(d.error ?? "Save failed"));
        // 200 = updated an existing date, 201 = newly created.
        const overwrote = res.status === 200;
        return res.json().then(() => setSaved({ overwrote }));
      })
      .catch((err: unknown) => {
        setError(typeof err === "string" ? err : "Failed to save schedule.");
      })
      .finally(() => setSaving(false));
  };

  return (
    <Inline gap="md" wrap className={styles.saveRow}>
      <Input
        className={styles.dateInput}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Schedule date"
      />
      <Button variant="success" size="sm" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved!" : "Save schedule"}
      </Button>
      {saved && (
        <Text variant="muted" size="sm">
          {saved.overwrote
            ? "Updated the schedule for this date."
            : "Saved. View it on the Saved page."}
        </Text>
      )}
      {error && (
        <Text variant="danger" size="sm">
          {error}
        </Text>
      )}
    </Inline>
  );
}
