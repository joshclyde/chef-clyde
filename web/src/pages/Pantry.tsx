import { useEffect, useState } from "react";

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

  if (loading) return <div><h1>Pantry</h1><p>Loading...</p></div>;

  return (
    <div>
      <h1>Pantry</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {editing ? (
        <form onSubmit={handleSubmit}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            cols={50}
            placeholder="List your pantry items..."
          />
          <div>
            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button type="button" onClick={handleCancel} disabled={saving}>Cancel</button>
          </div>
        </form>
      ) : (
        <div>
          <pre>{items || "No items yet."}</pre>
          <button onClick={handleEdit}>Edit</button>
        </div>
      )}
    </div>
  );
}
