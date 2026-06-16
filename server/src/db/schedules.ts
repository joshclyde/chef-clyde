import fs from "fs";
import path from "path";

import type { Schedule, ScheduleTask } from "../types/schedule";

/**
 * Migrate a stored task to the current shape. Older files used a
 * `completed: boolean` field; map it onto the newer `status` string and drop
 * the legacy key so reads always return a uniform shape.
 */
function normalizeTask(task: ScheduleTask & { completed?: boolean }): ScheduleTask {
  const { completed, ...rest } = task;
  return {
    ...rest,
    status: rest.status ?? (completed ? "completed" : "pending"),
  };
}

function normalizeSchedule(
  schedule: Schedule & { content?: string },
): Schedule {
  if (schedule.tasks) schedule.tasks = schedule.tasks.map(normalizeTask);
  // Legacy files stored the user's text under `content`; the field is now
  // `dayContext`. Carry it over (and drop the old key) when it hasn't been
  // migrated yet — the next write persists the new shape.
  const { content, ...rest } = schedule;
  return { ...rest, dayContext: rest.dayContext ?? content ?? "" };
}

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
    .map((f) =>
      normalizeSchedule(
        JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Schedule,
      ),
    );
}

export function readSchedule(id: string): Schedule | null {
  const filePath = path.join(getSchedulesDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return normalizeSchedule(
    JSON.parse(fs.readFileSync(filePath, "utf-8")) as Schedule,
  );
}

export function writeSchedule(schedule: Schedule): void {
  const dir = getSchedulesDir();
  fs.writeFileSync(
    path.join(dir, `${schedule.id}.json`),
    JSON.stringify(schedule, null, 2),
  );
}
