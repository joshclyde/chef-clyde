import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Heading,
  Inline,
  Stack,
  Text,
  Textarea,
} from "../ui";
import styles from "./Recipes.module.css";

type Ingredient = {
  amount: string;
  unit: string;
  name: string;
  notes?: string;
};

type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  tags?: string[];
  savedAt: string;
  notes?: Note[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<Record<string, string>>(
    {},
  );
  const [editingNote, setEditingNote] = useState<
    Record<string, { noteId: string; content: string } | null>
  >({});

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }

  async function addNote(recipeId: string) {
    const content = (newNoteContent[recipeId] ?? "").trim();
    if (!content) return;
    const res = await fetch(`/api/recipes/${recipeId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = (await res.json()) as { recipe: Recipe };
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? data.recipe : r)),
    );
    setNewNoteContent((prev) => ({ ...prev, [recipeId]: "" }));
  }

  async function saveNoteEdit(recipeId: string) {
    const edit = editingNote[recipeId];
    if (!edit || !edit.content.trim()) return;
    const res = await fetch(`/api/recipes/${recipeId}/notes/${edit.noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: edit.content }),
    });
    const data = (await res.json()) as { recipe: Recipe };
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? data.recipe : r)),
    );
    setEditingNote((prev) => ({ ...prev, [recipeId]: null }));
  }

  async function deleteNote(recipeId: string, noteId: string) {
    const res = await fetch(`/api/recipes/${recipeId}/notes/${noteId}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { recipe: Recipe };
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipeId ? data.recipe : r)),
    );
  }

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data: { recipes: Recipe[] }) => setRecipes(data.recipes))
      .catch(() => setError("Failed to load recipes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>Recipes</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Heading level={1}>Recipes</Heading>
      {error && <Text variant="danger">{error}</Text>}
      {recipes.length === 0 ? (
        <Text variant="muted">
          No recipes yet. Chat with Chef Clyde and click "Save to Recipes" to
          save one!
        </Text>
      ) : (
        <ul className={styles.list}>
          {recipes.map((recipe) => {
            const notes = recipe.notes ?? [];
            const activeEdit = editingNote[recipe.id] ?? null;
            return (
              <li key={recipe.id}>
                <Card>
                  <Stack gap="sm">
                    <Heading level={2}>{recipe.name}</Heading>
                    <Text variant="muted" size="sm">
                      Serves {recipe.servings} · Prep {recipe.prepTime}m · Cook{" "}
                      {recipe.cookTime}m
                    </Text>
                    <Text size="sm">{recipe.description}</Text>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <Inline gap="xs" wrap>
                        {recipe.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </Inline>
                    )}
                    <details>
                      <summary className={styles.summary}>
                        Ingredients ({recipe.ingredients.length})
                      </summary>
                      <ul className={styles.detailsList}>
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i}>
                            {ing.amount} {ing.unit} {ing.name}
                            {ing.notes ? ` (${ing.notes})` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                    <details>
                      <summary className={styles.summary}>
                        Steps ({recipe.steps.length})
                      </summary>
                      <ol className={styles.detailsList}>
                        {recipe.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </details>
                    <details>
                      <summary className={styles.summary}>
                        Notes ({notes.length})
                      </summary>
                      <Stack gap="sm">
                        {notes.length === 0 && (
                          <Text variant="subtle" size="sm">
                            No notes yet.
                          </Text>
                        )}
                        {notes.map((note) => {
                          const isEditing = activeEdit?.noteId === note.id;
                          return (
                            <div key={note.id} className={styles.noteItem}>
                              {isEditing ? (
                                <Stack gap="xs">
                                  <Textarea
                                    className={styles.noteTextarea}
                                    value={activeEdit.content}
                                    onChange={(e) =>
                                      setEditingNote((prev) => ({
                                        ...prev,
                                        [recipe.id]: {
                                          noteId: note.id,
                                          content: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <Inline gap="xs">
                                    <Button
                                      size="sm"
                                      onClick={() => saveNoteEdit(recipe.id)}
                                      disabled={!activeEdit.content.trim()}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setEditingNote((prev) => ({
                                          ...prev,
                                          [recipe.id]: null,
                                        }))
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </Inline>
                                </Stack>
                              ) : (
                                <Stack gap="xs">
                                  <Text size="sm" className={styles.notePre}>
                                    {note.content}
                                  </Text>
                                  <Text variant="subtle" size="xs">
                                    Added {formatDate(note.createdAt)}
                                    {note.updatedAt !== note.createdAt &&
                                      ` · Edited ${formatDate(note.updatedAt)}`}
                                  </Text>
                                  <Inline gap="xs">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setEditingNote((prev) => ({
                                          ...prev,
                                          [recipe.id]: {
                                            noteId: note.id,
                                            content: note.content,
                                          },
                                        }))
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() =>
                                        deleteNote(recipe.id, note.id)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </Inline>
                                </Stack>
                              )}
                            </div>
                          );
                        })}
                        <Stack gap="xs">
                          <Textarea
                            className={styles.noteTextarea}
                            placeholder="Add a note…"
                            value={newNoteContent[recipe.id] ?? ""}
                            onChange={(e) =>
                              setNewNoteContent((prev) => ({
                                ...prev,
                                [recipe.id]: e.target.value,
                              }))
                            }
                          />
                          <Inline gap="xs">
                            <Button
                              size="sm"
                              onClick={() => addNote(recipe.id)}
                              disabled={
                                !(newNoteContent[recipe.id] ?? "").trim()
                              }
                            >
                              Save Note
                            </Button>
                          </Inline>
                        </Stack>
                      </Stack>
                    </details>
                    <Text variant="subtle" size="xs">
                      Saved {new Date(recipe.savedAt).toLocaleDateString()}
                    </Text>
                    <Inline gap="sm">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteRecipe(recipe.id)}
                      >
                        Delete
                      </Button>
                    </Inline>
                  </Stack>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Stack>
  );
}
