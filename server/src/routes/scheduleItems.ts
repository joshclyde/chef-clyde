import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";

import {
  getScheduleItemsDir,
  getSoftDeleteDir,
  readAllScheduleItems,
  readScheduleItem,
  writeScheduleItem,
} from "../db/scheduleItems";
import type {
  ChoreDetails,
  Completion,
  DayOfWeek,
  FrequencyUnit,
  HobbyDetails,
  Occurrence,
  OccurrenceKind,
  ScheduleItem,
  ScheduleItemCategory,
  TimeOfDay,
  TodoDetails,
} from "../types/scheduleItem";

const router = express.Router();

const CATEGORIES: ScheduleItemCategory[] = [
  "chore",
  "hobby",
  "routine",
  "todo",
];
const FREQUENCY_UNITS: FrequencyUnit[] = ["days", "weeks", "months"];
const DAYS_OF_WEEK: DayOfWeek[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
const TIMES_OF_DAY: TimeOfDay[] = [
  "morning",
  "midday",
  "afternoon",
  "evening",
  "night",
  "any",
];

// Which occurrence kinds each category may use. Mirrors what each page produces:
// chores recur on a cadence, routines recur, to-dos are one-off, and hobbies can
// be anything from a booked event to a loose idea.
const ALLOWED_KINDS: Record<ScheduleItemCategory, OccurrenceKind[]> = {
  chore: ["frequency"],
  hobby: ["event", "weekly", "frequency", "oneoff"],
  routine: ["weekly", "frequency"],
  todo: ["oneoff"],
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

type CategoryDetails =
  | ChoreDetails
  | HobbyDetails
  | Record<string, never>
  | TodoDetails;

type ValidatedFields = {
  category: ScheduleItemCategory;
  label: string;
  occurrence: Occurrence;
  typicalTimeMinutes?: number;
  notes?: string;
  timeOfDay?: TimeOfDay;
  details: CategoryDetails;
};

/**
 * Validate an item's occurrence by kind, rejecting any kind the category does
 * not allow. `timeOfDay` is no longer part of the weekly variant — it lives on
 * the item — so it's not read here.
 */
function validateOccurrence(
  raw: unknown,
  allowed: OccurrenceKind[],
): { occurrence: Occurrence } | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "occurrence is required" };
  }
  const o = raw as Record<string, unknown>;
  if (
    typeof o.kind !== "string" ||
    !allowed.includes(o.kind as OccurrenceKind)
  ) {
    return { error: `occurrence.kind must be one of: ${allowed.join(", ")}` };
  }

  switch (o.kind) {
    case "event": {
      if (typeof o.date !== "string" || !DATE_PATTERN.test(o.date)) {
        return { error: "event occurrence needs a date (YYYY-MM-DD)" };
      }
      const start = o.startTime;
      const end = o.endTime;
      if (
        start != null &&
        (typeof start !== "string" || !TIME_PATTERN.test(start))
      ) {
        return { error: "event startTime must be HH:MM" };
      }
      if (end != null && (typeof end !== "string" || !TIME_PATTERN.test(end))) {
        return { error: "event endTime must be HH:MM" };
      }
      if (
        typeof start === "string" &&
        typeof end === "string" &&
        end <= start
      ) {
        return { error: "event endTime must be after startTime" };
      }
      const occurrence: Occurrence = { kind: "event", date: o.date };
      if (typeof start === "string") occurrence.startTime = start;
      if (typeof end === "string") occurrence.endTime = end;
      return { occurrence };
    }
    case "weekly": {
      const days = o.days;
      if (
        !Array.isArray(days) ||
        days.length === 0 ||
        !days.every((d) => DAYS_OF_WEEK.includes(d as DayOfWeek))
      ) {
        return { error: "weekly occurrence needs a non-empty days array" };
      }
      // De-dupe + order days canonically (Sun→Sat) so storage is stable.
      const uniqueDays = DAYS_OF_WEEK.filter((d) =>
        (days as DayOfWeek[]).includes(d),
      );
      return { occurrence: { kind: "weekly", days: uniqueDays } };
    }
    case "frequency": {
      const value = o.value;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return { error: "frequency value must be a positive number" };
      }
      if (
        typeof o.unit !== "string" ||
        !FREQUENCY_UNITS.includes(o.unit as FrequencyUnit)
      ) {
        return { error: "frequency unit must be days, weeks, or months" };
      }
      return {
        occurrence: { kind: "frequency", value, unit: o.unit as FrequencyUnit },
      };
    }
    default:
      return { occurrence: { kind: "oneoff" } };
  }
}

/** Validate the category-specific `details` object, returning a cleaned copy. */
function validateDetails(
  category: ScheduleItemCategory,
  raw: unknown,
): { details: CategoryDetails } | { error: string } {
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;

  switch (category) {
    case "chore": {
      if (d.room != null && typeof d.room !== "string") {
        return { error: "details.room must be a string" };
      }
      if (d.floor != null && typeof d.floor !== "string") {
        return { error: "details.floor must be a string" };
      }
      const room = typeof d.room === "string" ? d.room.trim() : "";
      const floor = typeof d.floor === "string" ? d.floor.trim() : "";
      const details: ChoreDetails = {};
      if (room) details.room = room;
      if (floor) details.floor = floor;
      return { details };
    }
    case "hobby": {
      if (d.groupLabel != null && typeof d.groupLabel !== "string") {
        return { error: "details.groupLabel must be a string" };
      }
      const groupLabel =
        typeof d.groupLabel === "string" ? d.groupLabel.trim() : "";
      const details: HobbyDetails = {};
      if (groupLabel) details.groupLabel = groupLabel;
      return { details };
    }
    case "todo": {
      if (
        d.dueDate != null &&
        (typeof d.dueDate !== "string" || !DATE_PATTERN.test(d.dueDate))
      ) {
        return { error: "details.dueDate must be a YYYY-MM-DD string" };
      }
      const dueDate = typeof d.dueDate === "string" ? d.dueDate.trim() : "";
      const details: TodoDetails = {};
      if (dueDate) details.dueDate = dueDate;
      return { details };
    }
    default:
      return { details: {} };
  }
}

/** Validate the user-editable fields shared by create + update. */
function validateItemInput(
  body: unknown,
): { fields: ValidatedFields } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "request body is required" };
  }
  const b = body as Record<string, unknown>;

  if (
    typeof b.category !== "string" ||
    !CATEGORIES.includes(b.category as ScheduleItemCategory)
  ) {
    return { error: "category must be one of chore, hobby, routine, todo" };
  }
  const category = b.category as ScheduleItemCategory;

  if (typeof b.label !== "string" || b.label.trim() === "") {
    return { error: "label is required" };
  }

  const time = b.typicalTimeMinutes;
  if (
    time != null &&
    (typeof time !== "number" || !Number.isFinite(time) || time < 0)
  ) {
    return { error: "typicalTimeMinutes must be a non-negative number" };
  }

  if (b.notes != null && typeof b.notes !== "string") {
    return { error: "notes must be a string" };
  }

  // timeOfDay anchors routines (required) and is an optional hint elsewhere.
  const tod = b.timeOfDay;
  if (category === "routine") {
    if (typeof tod !== "string" || !TIMES_OF_DAY.includes(tod as TimeOfDay)) {
      return { error: "timeOfDay is required for routines" };
    }
  } else if (
    tod != null &&
    (typeof tod !== "string" || !TIMES_OF_DAY.includes(tod as TimeOfDay))
  ) {
    return { error: "timeOfDay is invalid" };
  }

  const occ = validateOccurrence(b.occurrence, ALLOWED_KINDS[category]);
  if ("error" in occ) return { error: occ.error };

  const det = validateDetails(category, b.details);
  if ("error" in det) return { error: det.error };

  const cleanNotes = typeof b.notes === "string" ? b.notes.trim() : "";

  return {
    fields: {
      category,
      label: b.label.trim(),
      occurrence: occ.occurrence,
      ...(typeof time === "number" ? { typicalTimeMinutes: time } : {}),
      ...(cleanNotes === "" ? {} : { notes: cleanNotes }),
      ...(typeof tod === "string" ? { timeOfDay: tod as TimeOfDay } : {}),
      details: det.details,
    },
  };
}

/**
 * Assemble a stored `ScheduleItem` from validated fields and the server-owned
 * envelope (id, completion history, timestamps). The switch pairs each category
 * with its `details` shape so the discriminated union stays sound.
 */
function buildItem(
  fields: ValidatedFields,
  meta: {
    id: string;
    completions: Completion[];
    createdAt: string;
    updatedAt: string;
  },
): ScheduleItem {
  const base = {
    id: meta.id,
    label: fields.label,
    occurrence: fields.occurrence,
    completions: meta.completions,
    ...(fields.typicalTimeMinutes != null
      ? { typicalTimeMinutes: fields.typicalTimeMinutes }
      : {}),
    ...(fields.notes != null ? { notes: fields.notes } : {}),
    ...(fields.timeOfDay != null ? { timeOfDay: fields.timeOfDay } : {}),
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };
  // `fields.details` was validated against `fields.category`, but the two are
  // independent fields here, so narrow each with a cast as we pair them up.
  switch (fields.category) {
    case "chore":
      return {
        ...base,
        category: "chore",
        details: fields.details as ChoreDetails,
      };
    case "hobby":
      return {
        ...base,
        category: "hobby",
        details: fields.details as HobbyDetails,
      };
    case "todo":
      return {
        ...base,
        category: "todo",
        details: fields.details as TodoDetails,
      };
    default:
      return { ...base, category: "routine", details: {} };
  }
}

router.get("/", (req, res) => {
  const { category } = req.query as { category?: string };
  if (
    category !== undefined &&
    !CATEGORIES.includes(category as ScheduleItemCategory)
  ) {
    res.status(400).json({ error: "category filter is invalid" });
    return;
  }
  const items = readAllScheduleItems();
  res.json({
    items: category ? items.filter((i) => i.category === category) : items,
  });
});

router.post("/", (req, res) => {
  const result = validateItemInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const now = new Date().toISOString();
  const item = buildItem(result.fields, {
    id: crypto.randomUUID(),
    completions: [],
    createdAt: now,
    updatedAt: now,
  });
  writeScheduleItem(item);
  res.status(201).json({ item });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const existing = readScheduleItem(id);
  if (!existing) {
    res.status(404).json({ error: "Schedule item not found" });
    return;
  }
  const result = validateItemInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  // The client never sends completions, so keep the stored history on update.
  const item = buildItem(result.fields, {
    id: existing.id,
    completions: existing.completions,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  writeScheduleItem(item);
  res.status(200).json({ item });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getScheduleItemsDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Schedule item not found" });
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
  const item = readScheduleItem(id);
  if (!item) {
    res.status(404).json({ error: "Schedule item not found" });
    return;
  }
  const when =
    typeof performedAt === "string" ? performedAt : new Date().toISOString();
  if (Number.isNaN(new Date(when).getTime())) {
    res.status(400).json({ error: "performedAt is not a valid date" });
    return;
  }
  const completion: Completion = { id: crypto.randomUUID(), performedAt: when };
  item.completions = [...item.completions, completion];
  item.updatedAt = new Date().toISOString();
  writeScheduleItem(item);
  res.status(201).json({ item });
});

router.delete("/:id/completions/:completionId", (req, res) => {
  const { id, completionId } = req.params;
  const item = readScheduleItem(id);
  if (!item) {
    res.status(404).json({ error: "Schedule item not found" });
    return;
  }
  const before = item.completions.length;
  item.completions = item.completions.filter((c) => c.id !== completionId);
  if (item.completions.length === before) {
    res.status(404).json({ error: "Completion not found" });
    return;
  }
  item.updatedAt = new Date().toISOString();
  writeScheduleItem(item);
  res.status(200).json({ item });
});

export default router;
