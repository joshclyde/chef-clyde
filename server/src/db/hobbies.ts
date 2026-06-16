import fs from "fs";
import path from "path";

import type { Hobby } from "../types/hobby";

export function getHobbiesDir(): string {
  const dir = path.join(process.env.DB_PATH!, "hobbies");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(process.env.DB_PATH!, "soft-deletion", "hobbies");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllHobbies(): Hobby[] {
  const dir = getHobbiesDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Hobby);
}

export function readHobby(id: string): Hobby | null {
  const filePath = path.join(getHobbiesDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Hobby;
}

export function writeHobby(hobby: Hobby): void {
  const dir = getHobbiesDir();
  fs.writeFileSync(
    path.join(dir, `${hobby.id}.json`),
    JSON.stringify(hobby, null, 2),
  );
}

/**
 * Locate the hobby that owns a given task id (task ids are UUIDs, unique across
 * hobbies). Used when a generated schedule task linked via hobbyTaskId is
 * completed and we need to log a completion onto the right task.
 */
export function findHobbyByTaskId(taskId: string): Hobby | null {
  for (const hobby of readAllHobbies()) {
    if (hobby.tasks.some((t) => t.id === taskId)) return hobby;
  }
  return null;
}
