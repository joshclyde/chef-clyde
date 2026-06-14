import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import type { Todo } from "../types/todo";
import {
  getSoftDeleteDir,
  getTodosDir,
  readAllTodos,
  readTodo,
  writeTodo,
} from "../db/todos";

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type TodoInput = {
  title?: unknown;
  dueDate?: unknown;
  notes?: unknown;
};

type ValidatedFields = Pick<Todo, "title" | "dueDate" | "notes">;

/**
 * Validate the user-editable fields shared by create + update. Returns the
 * cleaned fields, or an error message describing the first problem found.
 */
function validateTodoInput(
  body: TodoInput,
): { fields: ValidatedFields } | { error: string } {
  const { title, dueDate, notes } = body;

  if (typeof title !== "string" || title.trim() === "") {
    return { error: "title is required" };
  }
  if (
    dueDate !== undefined &&
    dueDate !== null &&
    (typeof dueDate !== "string" || !DATE_PATTERN.test(dueDate))
  ) {
    return { error: "dueDate must be a YYYY-MM-DD string" };
  }
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return { error: "notes must be a string" };
  }

  const cleanDueDate = typeof dueDate === "string" ? dueDate.trim() : "";
  const cleanNotes = typeof notes === "string" ? notes.trim() : "";

  return {
    fields: {
      title: title.trim(),
      dueDate: cleanDueDate === "" ? undefined : cleanDueDate,
      notes: cleanNotes === "" ? undefined : cleanNotes,
    },
  };
}

router.get("/", (_req, res) => {
  res.json({ todos: readAllTodos() });
});

router.post("/", (req, res) => {
  const result = validateTodoInput(req.body as TodoInput);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const now = new Date().toISOString();
  const todo: Todo = {
    id: crypto.randomUUID(),
    ...result.fields,
    createdAt: now,
    updatedAt: now,
  };
  writeTodo(todo);
  res.status(201).json({ todo });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const todo = readTodo(id);
  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  const result = validateTodoInput(req.body as TodoInput);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  // Spread the validated fields so cleared optionals (dueDate/notes) reset to
  // undefined rather than lingering from the prior version.
  const updated: Todo = {
    ...todo,
    title: result.fields.title,
    dueDate: result.fields.dueDate,
    notes: result.fields.notes,
    updatedAt: new Date().toISOString(),
  };
  writeTodo(updated);
  res.status(200).json({ todo: updated });
});

// Toggle the done state so the list page can check items off directly.
router.patch("/:id/complete", (req, res) => {
  const { id } = req.params;
  const { completed } = req.body as { completed?: unknown };
  if (typeof completed !== "boolean") {
    res.status(400).json({ error: "completed must be a boolean" });
    return;
  }
  const todo = readTodo(id);
  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  if (completed) todo.completedAt = new Date().toISOString();
  else delete todo.completedAt;
  todo.updatedAt = new Date().toISOString();
  writeTodo(todo);
  res.status(200).json({ todo });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getTodosDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

export default router;
