import { useEffect, useState } from "react";

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

export default function SavedRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<Record<string, string>>({});
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
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? data.recipe : r)));
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
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? data.recipe : r)));
    setEditingNote((prev) => ({ ...prev, [recipeId]: null }));
  }

  async function deleteNote(recipeId: string, noteId: string) {
    const res = await fetch(`/api/recipes/${recipeId}/notes/${noteId}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { recipe: Recipe };
    setRecipes((prev) => prev.map((r) => (r.id === recipeId ? data.recipe : r)));
  }

  useEffect(() => {
    fetch("/api/recipes")
      .then((res) => res.json())
      .then((data: { recipes: Recipe[] }) => setRecipes(data.recipes))
      .catch(() => setError("Failed to load saved recipes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="saved-recipes">
        <h1>Saved Recipes</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="saved-recipes">
      <h1>Saved Recipes</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {recipes.length === 0 ? (
        <p className="no-recipes-hint">
          No saved recipes yet. Chat with Chef Clyde and click "Save Recipe" to
          save one!
        </p>
      ) : (
        <ul className="recipe-list">
          {recipes.map((recipe) => {
            const notes = recipe.notes ?? [];
            const activeEdit = editingNote[recipe.id] ?? null;
            return (
              <li key={recipe.id} className="recipe-card">
                <h2>{recipe.name}</h2>
                <p className="recipe-meta">
                  Serves {recipe.servings} · Prep {recipe.prepTime}m · Cook{" "}
                  {recipe.cookTime}m
                </p>
                <p className="recipe-description">{recipe.description}</p>
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="recipe-tags">
                    {recipe.tags.map((tag) => (
                      <span key={tag} className="recipe-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <details>
                  <summary>Ingredients ({recipe.ingredients.length})</summary>
                  <ul>
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i}>
                        {ing.amount} {ing.unit} {ing.name}
                        {ing.notes ? ` (${ing.notes})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Steps ({recipe.steps.length})</summary>
                  <ol>
                    {recipe.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </details>
                <details>
                  <summary>Notes ({notes.length})</summary>
                  <div className="recipe-notes">
                    {notes.length === 0 && (
                      <p className="note-empty">No notes yet.</p>
                    )}
                    {notes.map((note) => {
                      const isEditing =
                        activeEdit?.noteId === note.id;
                      return (
                        <div key={note.id} className="note-item">
                          {isEditing ? (
                            <>
                              <textarea
                                className="note-edit-textarea"
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
                              <div className="note-actions">
                                <button
                                  className="note-save-btn"
                                  onClick={() => saveNoteEdit(recipe.id)}
                                  disabled={!activeEdit.content.trim()}
                                >
                                  Save
                                </button>
                                <button
                                  className="note-cancel-btn"
                                  onClick={() =>
                                    setEditingNote((prev) => ({
                                      ...prev,
                                      [recipe.id]: null,
                                    }))
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="note-content">{note.content}</p>
                              <p className="note-timestamps">
                                Added {formatDate(note.createdAt)}
                                {note.updatedAt !== note.createdAt &&
                                  ` · Edited ${formatDate(note.updatedAt)}`}
                              </p>
                              <div className="note-actions">
                                <button
                                  className="note-edit-btn"
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
                                </button>
                                <button
                                  className="note-delete-btn"
                                  onClick={() =>
                                    deleteNote(recipe.id, note.id)
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <div className="note-add">
                      <textarea
                        className="note-edit-textarea"
                        placeholder="Add a note…"
                        value={newNoteContent[recipe.id] ?? ""}
                        onChange={(e) =>
                          setNewNoteContent((prev) => ({
                            ...prev,
                            [recipe.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="note-save-btn"
                        onClick={() => addNote(recipe.id)}
                        disabled={!(newNoteContent[recipe.id] ?? "").trim()}
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </details>
                <p className="recipe-saved-at">
                  Saved {new Date(recipe.savedAt).toLocaleDateString()}
                </p>
                <button
                  className="recipe-delete-btn"
                  onClick={() => deleteRecipe(recipe.id)}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
