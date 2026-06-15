import fs from "fs";
import path from "path";
import type { Routine } from "../types/routine";

export function getRoutinesDir(): string {
  const dir = path.join(process.env.DB_PATH!, "routines");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(process.env.DB_PATH!, "soft-deletion", "routines");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllRoutines(): Routine[] {
  const dir = getRoutinesDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Routine,
    );
}

export function readRoutine(id: string): Routine | null {
  const filePath = path.join(getRoutinesDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Routine;
}

export function writeRoutine(routine: Routine): void {
  const dir = getRoutinesDir();
  fs.writeFileSync(
    path.join(dir, `${routine.id}.json`),
    JSON.stringify(routine, null, 2),
  );
}

/**
 * Locate a routine by id. Used when a generated schedule task linked via
 * routineId is completed and we need to log a completion onto the right
 * routine. Routines are flat (no nested tasks), so this is a direct read.
 */
export function findRoutineById(id: string): Routine | null {
  return readRoutine(id);
}
