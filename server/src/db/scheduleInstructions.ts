import fs from "fs";
import path from "path";

/**
 * Standing, user-authored instructions for the schedule generator, stored as a
 * single global text blob (one per install, not per schedule). Mirrors the
 * pantry singleton.
 */
function getFilePath(): string {
  return path.join(process.env.DB_PATH!, "schedule-instructions.json");
}

export function readScheduleInstructions(): string {
  const filePath = getFilePath();
  if (!fs.existsSync(filePath)) return "";
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    instructions?: string;
  };
  return data.instructions ?? "";
}

export function writeScheduleInstructions(instructions: string): void {
  fs.writeFileSync(getFilePath(), JSON.stringify({ instructions }, null, 2));
}
