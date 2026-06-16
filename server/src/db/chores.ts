import fs from "fs";
import path from "path";

import type { Chore } from "../types/chore";

export function getChoresDir(): string {
  const dir = path.join(process.env.DB_PATH!, "chores");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(process.env.DB_PATH!, "soft-deletion", "chores");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllChores(): Chore[] {
  const dir = getChoresDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Chore,
    );
}

export function readChore(id: string): Chore | null {
  const filePath = path.join(getChoresDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Chore;
}

export function writeChore(chore: Chore): void {
  const dir = getChoresDir();
  fs.writeFileSync(
    path.join(dir, `${chore.id}.json`),
    JSON.stringify(chore, null, 2),
  );
}
