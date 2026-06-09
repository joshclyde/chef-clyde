import { useEffect, useState } from "react";
import { Button, Card, Heading, Inline, Stack, Text, Textarea } from "../ui";
import styles from "./Pantry.module.css";

export default function Pantry() {
  const [items, setItems] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pantry")
      .then((res) => res.json())
      .then((data: { pantry: string }) => setItems(data.pantry))
      .catch(() => setError("Failed to load pantry."))
      .finally(() => setLoading(false));
  }, []);

  function handleEdit() {
    setDraft(items);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    fetch("/api/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pantry: draft }),
    })
      .then((res) => res.json())
      .then(() => {
        setItems(draft);
        setEditing(false);
      })
      .catch(() => setError("Failed to save pantry."))
      .finally(() => setSaving(false));
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Pantry</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Heading level={1}>Pantry</Heading>
      {error && <Text variant="danger">{error}</Text>}
      {editing ? (
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              placeholder="List your pantry items..."
            />
            <Inline gap="sm">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </Inline>
          </Stack>
        </form>
      ) : (
        <Stack gap="sm">
          <Card className={styles.viewer}>
            <pre className={styles.pre}>{items || "No items yet."}</pre>
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
