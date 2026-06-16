import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";

import {
  getChoresDir,
  getSoftDeleteDir,
  readAllChores,
  readChore,
  writeChore,
} from "../db/chores";
import type { Chore, Completion, FrequencyUnit } from "../types/chore";

const router = express.Router();

const FREQUENCY_UNITS: FrequencyUnit[] = ["days", "weeks", "months"];

type ChoreInput = {
  name?: unknown;
  frequencyValue?: unknown;
  frequencyUnit?: unknown;
  typicalTimeMinutes?: unknown;
  room?: unknown;
  floor?: unknown;
};

type ValidatedFields = Pick<
  Chore,
  | "name"
  | "frequencyValue"
  | "frequencyUnit"
  | "typicalTimeMinutes"
  | "room"
  | "floor"
>;

/**
 * Validate the user-editable fields shared by create + update. Returns the
 * cleaned fields, or an error message describing the first problem found.
 */
function validateChoreInput(
  body: ChoreInput,
): { fields: ValidatedFields } | { error: string } {
  const {
    name,
    frequencyValue,
    frequencyUnit,
    typicalTimeMinutes,
    room,
    floor,
  } = body;

  if (typeof name !== "string" || name.trim() === "") {
    return { error: "name is required" };
  }
  if (
    typeof frequencyValue !== "number" ||
    !Number.isFinite(frequencyValue) ||
    frequencyValue <= 0
  ) {
    return { error: "frequencyValue must be a positive number" };
  }
  if (
    typeof frequencyUnit !== "string" ||
    !FREQUENCY_UNITS.includes(frequencyUnit as FrequencyUnit)
  ) {
    return { error: "frequencyUnit must be one of days, weeks, months" };
  }
  if (
    typicalTimeMinutes !== undefined &&
    typicalTimeMinutes !== null &&
    (typeof typicalTimeMinutes !== "number" ||
      !Number.isFinite(typicalTimeMinutes) ||
      typicalTimeMinutes < 0)
  ) {
    return { error: "typicalTimeMinutes must be a non-negative number" };
  }
  if (room !== undefined && room !== null && typeof room !== "string") {
    return { error: "room must be a string" };
  }
  if (floor !== undefined && floor !== null && typeof floor !== "string") {
    return { error: "floor must be a string" };
  }

  const cleanRoom = typeof room === "string" ? room.trim() : "";
  const cleanFloor = typeof floor === "string" ? floor.trim() : "";

  return {
    fields: {
      name: name.trim(),
      frequencyValue,
      frequencyUnit: frequencyUnit as FrequencyUnit,
      typicalTimeMinutes:
        typeof typicalTimeMinutes === "number" ? typicalTimeMinutes : undefined,
      room: cleanRoom === "" ? undefined : cleanRoom,
      floor: cleanFloor === "" ? undefined : cleanFloor,
    },
  };
}

router.get("/", (_req, res) => {
  res.json({ chores: readAllChores() });
});

router.post("/", (req, res) => {
  const result = validateChoreInput(req.body as ChoreInput);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const now = new Date().toISOString();
  const chore: Chore = {
    id: crypto.randomUUID(),
    ...result.fields,
    completions: [],
    createdAt: now,
    updatedAt: now,
  };
  writeChore(chore);
  res.status(201).json({ chore });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const chore = readChore(id);
  if (!chore) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }
  const result = validateChoreInput(req.body as ChoreInput);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const updated: Chore = {
    ...chore,
    ...result.fields,
    updatedAt: new Date().toISOString(),
  };
  writeChore(updated);
  res.status(200).json({ chore: updated });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getChoresDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

router.post("/:id/completions", (req, res) => {
  const { id } = req.params;
  const { performedAt } = req.body as { performedAt?: unknown };
  if (performedAt !== undefined && typeof performedAt !== "string") {
    res.status(400).json({ error: "performedAt must be an ISO date string" });
    return;
  }
  const chore = readChore(id);
  if (!chore) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }
  const when =
    typeof performedAt === "string" ? performedAt : new Date().toISOString();
  if (Number.isNaN(new Date(when).getTime())) {
    res.status(400).json({ error: "performedAt is not a valid date" });
    return;
  }
  const completion: Completion = {
    id: crypto.randomUUID(),
    performedAt: when,
  };
  chore.completions = [...chore.completions, completion];
  chore.updatedAt = new Date().toISOString();
  writeChore(chore);
  res.status(201).json({ chore });
});

router.delete("/:id/completions/:completionId", (req, res) => {
  const { id, completionId } = req.params;
  const chore = readChore(id);
  if (!chore) {
    res.status(404).json({ error: "Chore not found" });
    return;
  }
  const before = chore.completions.length;
  chore.completions = chore.completions.filter((c) => c.id !== completionId);
  if (chore.completions.length === before) {
    res.status(404).json({ error: "Completion not found" });
    return;
  }
  chore.updatedAt = new Date().toISOString();
  writeChore(chore);
  res.status(200).json({ chore });
});

export default router;
