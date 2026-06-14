import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button, Heading, Inline, Input, Stack, Text, Textarea } from "../../ui";
import { cn } from "../../ui/cn";
import {
  dueSortKey,
  dueStatus,
  useTodos,
  type Todo,
  type TodoInput,
} from "./useTodos";
import styles from "./Todos.module.css";

/** Format a "YYYY-MM-DD" string as a readable local date (no TZ shift). */
function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The to-do's deadline status, shown next to its title. */
function DueBadge({ todo }: { todo: Todo }) {
  const status = dueStatus(todo);
  if (status === "none" || !todo.dueDate) return null;
  if (status === "overdue") {
    return (
      <Text size="sm" variant="danger">
        Overdue · {formatDate(todo.dueDate)}
      </Text>
    );
  }
  if (status === "today") {
    return (
      <Text size="sm" variant="strong">
        Due today
      </Text>
    );
  }
  return (
    <Text size="sm" variant="muted">
      {formatDate(todo.dueDate)}
    </Text>
  );
}

/** Inline editor for an existing to-do: title + optional due date + notes. */
function TodoEditor({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: Todo;
  submitting: boolean;
  onSubmit: (values: TodoInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const valid = title.trim() !== "";

  function save() {
    if (!valid || submitting) return;
    onSubmit({
      title: title.trim(),
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className={styles.editRow}>
      <div className={styles.editFields}>
        <Input
          ref={titleRef}
          className={styles.editTitle}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What needs doing?"
          aria-label="To-do title"
        />
        <Input
          className={styles.editDate}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Due date"
        />
      </div>
      <Textarea
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for the AI (optional) — e.g. 'needs ~30 min, do in the afternoon'"
        aria-label="Notes"
      />
      <Inline gap="2xs">
        <Button size="sm" onClick={save} disabled={!valid || submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </Inline>
    </div>
  );
}

export default function Todos() {
  const {
    todos,
    loading,
    error,
    createTodo,
    updateTodo,
    toggleComplete,
    deleteTodo,
  } = useTodos();

  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Open to-dos first (most-due first), then completed ones (most recent first).
  const open = todos
    .filter((t) => !t.completedAt)
    .sort((a, b) => dueSortKey(a) - dueSortKey(b));
  const done = todos
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const ordered = [...open, ...done];

  async function handleAdd() {
    if (newTitle.trim() === "" || adding) return;
    setAdding(true);
    setActionError(null);
    try {
      await createTodo({
        title: newTitle.trim(),
        dueDate: newDue || undefined,
      });
      setNewTitle("");
      setNewDue("");
    } catch {
      setActionError("Failed to add to-do.");
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(id: string, values: TodoInput) {
    setSubmitting(true);
    setActionError(null);
    try {
      await updateTodo(id, values);
      setEditingId(null);
    } catch {
      setActionError("Failed to save to-do.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Stack gap="lg" className={styles.page}>
        <Heading level={1}>To-Dos</Heading>
        <Text variant="muted">Loading...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" className={styles.page}>
      <Heading level={1}>To-Dos</Heading>
      <Text variant="muted">
        One-off things to get done. These are fed into your daily schedule, where
        Clyde can slot and link them.
      </Text>

      <div className={styles.addRow}>
        <Input
          className={styles.addTitle}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a to-do…"
          aria-label="New to-do title"
        />
        <Input
          className={styles.addDate}
          type="date"
          value={newDue}
          onChange={(e) => setNewDue(e.target.value)}
          aria-label="New to-do due date"
        />
        <Button onClick={handleAdd} disabled={newTitle.trim() === "" || adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>

      {(error || actionError) && (
        <Text variant="danger">{error ?? actionError}</Text>
      )}

      {ordered.length === 0 ? (
        <Text variant="muted">No to-dos yet. Add one above.</Text>
      ) : (
        <div className={styles.list}>
          {ordered.map((todo) => {
            if (editingId === todo.id) {
              return (
                <TodoEditor
                  key={todo.id}
                  initial={todo}
                  submitting={submitting}
                  onSubmit={(values) => handleUpdate(todo.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            const completed = Boolean(todo.completedAt);
            return (
              <div
                key={todo.id}
                className={cn(styles.todoRow, completed && styles.completed)}
              >
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={completed}
                  aria-label={`Mark "${todo.title}" done`}
                  onChange={(e) => toggleComplete(todo.id, e.target.checked)}
                />
                <div className={styles.body}>
                  <Inline gap="sm">
                    <span className={styles.title}>{todo.title}</span>
                    <DueBadge todo={todo} />
                  </Inline>
                  {todo.notes && (
                    <Text size="sm" variant="muted">
                      {todo.notes}
                    </Text>
                  )}
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Edit to-do"
                    onClick={() => setEditingId(todo.id)}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="Delete to-do"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Stack>
  );
}
