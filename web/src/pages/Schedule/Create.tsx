import { useState } from "react";
import { Button, Heading, Inline, Input, Stack, Text, Textarea } from "../../ui";
import { ChatMessages } from "../Chat/ChatMessages";
import { useScheduleChat } from "./useScheduleChat";
import styles from "./Schedule.module.css";

/** Today's date as a local "YYYY-MM-DD" string (en-CA formats this way). */
function todayLocal() {
  return new Date().toLocaleDateString("en-CA");
}

export default function ScheduleCreate() {
  const {
    messages,
    input,
    setInput,
    loading,
    saving,
    saved,
    saveError,
    latestSchedule,
    submit,
    saveSchedule,
    handleKeyDown,
  } = useScheduleChat();
  const [date, setDate] = useState(todayLocal());

  const hasMessages = messages.length > 0;
  const canSave = !loading && latestSchedule != null;

  return (
    <Stack gap="lg" className={styles.page}>
      <Heading level={1}>Create a schedule</Heading>
      {!hasMessages && (
        <Text variant="muted">
          Describe your day and I'll build a time-blocked schedule around your
          chores and what's due.
        </Text>
      )}

      {hasMessages && <ChatMessages messages={messages} loading={loading} />}

      {canSave && (
        <Inline gap="md" wrap className={styles.saveRow}>
          <Input
            className={styles.dateInput}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Schedule date"
          />
          <Button
            variant="success"
            size="sm"
            onClick={() => saveSchedule(date)}
            disabled={saving}
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save schedule"}
          </Button>
          {saved && (
            <Text variant="muted" size="sm">
              {saved.overwrote
                ? "Updated the schedule for this date."
                : "Saved. View it on the Saved page."}
            </Text>
          )}
          {saveError && (
            <Text variant="danger" size="sm">
              {saveError}
            </Text>
          )}
        </Inline>
      )}

      <Inline gap="sm" align="end" className={styles.inputRow}>
        <Textarea
          className={styles.inputField}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasMessages
              ? "Refine the schedule..."
              : "e.g. Plan a productive Saturday with some downtime"
          }
          disabled={loading}
          rows={3}
        />
        <Button onClick={submit} disabled={loading || !input.trim()}>
          Send
        </Button>
      </Inline>
    </Stack>
  );
}
