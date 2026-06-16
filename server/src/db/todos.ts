import fs from "fs";
import path from "path";

import type { Todo } from "../types/todo";

export function getTodosDir(): string {
  const dir = path.join(process.env.DB_PATH!, "todos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(process.env.DB_PATH!, "soft-deletion", "todos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllTodos(): Todo[] {
  const dir = getTodosDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Todo,
    );
}

export function readTodo(id: string): Todo | null {
  const filePath = path.join(getTodosDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Todo;
}

export function writeTodo(todo: Todo): void {
  const dir = getTodosDir();
  fs.writeFileSync(
    path.join(dir, `${todo.id}.json`),
    JSON.stringify(todo, null, 2),
  );
}
