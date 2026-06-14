import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Heading, Inline, Input, Stack, Text, Textarea } from "../../ui";
import { HobbyCard } from "./HobbyCard";
import { useHobbies } from "./useHobbies";
import styles from "./Hobbies.module.css";

export default function Hobbies() {
  const {
    hobbies,
    loading,
    error,
    createHobby,
    updateHobby,
    deleteHobby,
    logCompletion,
    deleteCompletion,
  } = useHobbies();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create() {
    if (name.trim() === "") return;
    setSubmitting(true);
    setFormError(null);
    try {
      await createHobby({
        name: name.trim(),
        notes: notes.trim() || undefined,
        tasks: [],
      });
      setName("");
      setNotes("");
      setAdding(false);
    } catch {
      setFormError("Failed to create hobby.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Hobbies</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Stack gap="2xs">
        <Heading level={1}>Hobbies</Heading>
        <Text variant="muted">
          Track the things you want to make time for. Add tasks under each hobby
          — a weekly session, a booked event, a cadence, or a loose idea — and
          the daily schedule will plan around them.
        </Text>
      </Stack>

      {error && <Text variant="danger">{error}</Text>}

      {adding ? (
        <Stack gap="2xs" className={styles.newHobby}>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hobby name, e.g. Pickleball"
            aria-label="New hobby name"
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
          />
          {formError && (
            <Text variant="danger" size="sm">
              {formError}
            </Text>
          )}
          <Inline gap="2xs">
            <Button onClick={create} disabled={submitting || name.trim() === ""}>
              {submitting ? "Adding..." : "Add hobby"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setName("");
                setNotes("");
                setFormError(null);
              }}
            >
              Cancel
            </Button>
          </Inline>
        </Stack>
      ) : (
        <Inline>
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden /> New hobby
          </Button>
        </Inline>
      )}

      {hobbies.length === 0 ? (
        <Text variant="muted">No hobbies yet. Add one to get started.</Text>
      ) : (
        <Stack gap="md">
          {hobbies.map((hobby) => (
            <HobbyCard
              key={hobby.id}
              hobby={hobby}
              onUpdate={updateHobby}
              onDelete={deleteHobby}
              onLogSession={logCompletion}
              onDeleteSession={deleteCompletion}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
