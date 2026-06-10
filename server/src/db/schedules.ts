import fs from "fs";
import path from "path";
import type { Schedule } from "../types/schedule";

export function getSchedulesDir(): string {
  const dir = path.join(process.env.DB_PATH!, "schedules");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(process.env.DB_PATH!, "soft-deletion", "schedules");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllSchedules(): Schedule[] {
  const dir = getSchedulesDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Schedule,
    );
}

export function readSchedule(id: string): Schedule | null {
  const filePath = path.join(getSchedulesDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Schedule;
}

export function writeSchedule(schedule: Schedule): void {
  const dir = getSchedulesDir();
  fs.writeFileSync(
    path.join(dir, `${schedule.id}.json`),
    JSON.stringify(schedule, null, 2),
  );
}
