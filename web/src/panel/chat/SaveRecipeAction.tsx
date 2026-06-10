import { useState } from "react";
import { Button, Inline, Text } from "../../ui";
import { type Message } from "./types";

/** "Save to Recipes" action for the Cookbook chat. Manages its own save state. */
export function SaveRecipeAction({ messages }: { messages: Message[] }) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (saving || messages.length === 0) return;
    setSaving(true);
    setError(null);

    fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((d) => Promise.reject(d.error ?? "Save failed"));
        return res.json();
      })
      .then((data: { recipe: { id: string } }) => {
        setSavedId(data.recipe.id);
      })
      .catch((err: unknown) => {
        setError(typeof err === "string" ? err : "Failed to save recipe.");
      })
      .finally(() => setSaving(false));
  };

  return (
    <Inline gap="md">
      <Button variant="success" size="sm" onClick={save} disabled={saving}>
        {saving ? "Saving..." : savedId ? "Saved!" : "Save to Recipes"}
      </Button>
      {error && (
        <Text variant="danger" size="sm">
          {error}
        </Text>
      )}
    </Inline>
  );
}
