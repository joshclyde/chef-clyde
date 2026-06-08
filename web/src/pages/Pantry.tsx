import { useState } from "react";

export default function Pantry() {
  const [items, setItems] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  function handleEdit() {
    setDraft(items);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Pantry items saved:", draft);
    setItems(draft);
    setEditing(false);
  }

  return (
    <div>
      <h1>Pantry</h1>
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
            <button type="submit">Save</button>
            <button type="button" onClick={handleCancel}>Cancel</button>
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
