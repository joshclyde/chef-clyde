import { useEffect, useState } from "react";

import { Button, Card, Heading, Inline, Stack, Text, Textarea } from "../../ui";
import styles from "./Schedule.module.css";

/**
 * Standing instructions fed into the schedule generator on every run — e.g.
 * "Sleep in until 9:00 AM every Saturday". Stored as a single global text blob
 * (one per install). Mirrors the Pantry page's view/edit/save flow.
 */
export default function ScheduleInstructions() {
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/schedule-instructions")
      .then((res) => res.json())
      .then((data: { instructions: string }) =>
        setInstructions(data.instructions),
      )
      .catch(() => setError("Failed to load instructions."))
      .finally(() => setLoading(false));
  }, []);

  function handleEdit() {
    setDraft(instructions);
    setEditing(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    fetch("/api/schedule-instructions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions: draft }),
    })
      .then((res) => res.json())
      .then(() => {
        setInstructions(draft);
        setEditing(false);
      })
      .catch(() => setError("Failed to save instructions."))
      .finally(() => setSaving(false));
  }

  const intro = (
    <Stack gap="2xs">
      <Heading level={1}>Schedule instructions</Heading>
      <Text variant="muted">
        Standing guidance applied every time you generate a schedule — e.g.
        "Sleep in until 9:00 AM every Saturday" or "Always block 12:00–13:00 for
        lunch."
      </Text>
    </Stack>
  );

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        {intro}
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      {intro}
      {error && <Text variant="danger">{error}</Text>}
      {editing ? (
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <Textarea
              className={styles.editField}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              placeholder="Add instructions the schedule generator should always follow..."
            />
            <Inline gap="sm">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </Inline>
          </Stack>
        </form>
      ) : (
        <Stack gap="sm">
          <Card>
            <Text className={styles.content}>
              {instructions || "No instructions yet."}
            </Text>
          </Card>
          <Inline gap="sm">
            <Button variant="secondary" onClick={handleEdit}>
              Edit
            </Button>
          </Inline>
        </Stack>
      )}
    </Stack>
  );
}
