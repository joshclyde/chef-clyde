import fs from "fs";
import path from "path";

import type { ScheduleItem } from "../types/scheduleItem";

export function getScheduleItemsDir(): string {
  const dir = path.join(process.env.DB_PATH!, "schedule-items");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(
    process.env.DB_PATH!,
    "soft-deletion",
    "schedule-items",
  );
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllScheduleItems(): ScheduleItem[] {
  const dir = getScheduleItemsDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) =>
        JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as ScheduleItem,
    );
}

export function readScheduleItem(id: string): ScheduleItem | null {
  const filePath = path.join(getScheduleItemsDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as ScheduleItem;
}

export function writeScheduleItem(item: ScheduleItem): void {
  const dir = getScheduleItemsDir();
  fs.writeFileSync(
    path.join(dir, `${item.id}.json`),
    JSON.stringify(item, null, 2),
  );
}
