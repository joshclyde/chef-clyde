import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import type { Schedule } from "../types/schedule";
import {
  getSchedulesDir,
  getSoftDeleteDir,
  readAllSchedules,
  readSchedule,
  writeSchedule,
} from "../db/schedules";
import { generateScheduleResponse } from "../services/schedule";
import { parseScheduleTasks } from "../services/scheduleParser";

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MOCK_SCHEDULE =
  "Mocked daily schedule.\n\n" +
  "8:00–8:30 — Morning coffee and planning\n" +
  "9:00–9:45 — Clean the shower (overdue)\n" +
  "12:00–13:00 — Lunch\n" +
  "16:00–16:05 — Scoop attic litter (due now)\n" +
  "18:00–19:00 — Dinner";

router.get("/", (_req, res) => {
  res.json({ schedules: readAllSchedules() });
});

router.post("/generate", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (process.env.MOCK_AI === "true") {
    res.json({ content: MOCK_SCHEDULE });
    return;
  }

  try {
    const content = await generateScheduleResponse(messages);
    res.json({ content });
  } catch (error) {
    console.error("Schedule generation error:", error);
    res.status(500).json({ error: "Failed to generate schedule" });
  }
});

router.post("/", (req, res) => {
  const { date, content } = req.body as { date?: unknown; content?: unknown };

  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const now = new Date().toISOString();

  // One schedule per calendar date: update the existing day if present.
  const existing = readAllSchedules().find((s) => s.date === date);
  if (existing) {
    const updated: Schedule = {
      ...existing,
      content: content.trim(),
      updatedAt: now,
    };
    writeSchedule(updated);
    res.status(200).json({ schedule: updated });
    return;
  }

  const schedule: Schedule = {
    id: crypto.randomUUID(),
    date,
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
  };
  writeSchedule(schedule);
  res.status(201).json({ schedule });
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { date, content } = req.body as { date?: unknown; content?: unknown };

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    res.status(400).json({ error: "date is required (YYYY-MM-DD format)" });
    return;
  }
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const trimmed = content.trim();
  const updated: Schedule = {
    ...schedule,
    date,
    content: trimmed,
    updatedAt: new Date().toISOString(),
  };
  // The parsed tasks were derived from the old text — drop them when the
  // content changes so a stale task list can't linger. The user re-parses.
  if (trimmed !== schedule.content) delete updated.tasks;
  writeSchedule(updated);
  res.status(200).json({ schedule: updated });
});

// Parse a saved schedule's free text into a structured, ordered task list and
// persist it onto the schedule. Mirrors the recipe-extraction route.
router.post("/:id/parse", async (req, res) => {
  const { id } = req.params;
  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const result = await parseScheduleTasks(schedule.content);
  if ("error" in result) {
    const status = result.error === "No tasks found in this schedule" ? 422 : 500;
    res.status(status).json({ error: result.error });
    return;
  }

  const updated: Schedule = {
    ...schedule,
    tasks: result.tasks.map((task) => ({
      ...task,
      id: crypto.randomUUID(),
      completed: false,
    })),
    updatedAt: new Date().toISOString(),
  };
  writeSchedule(updated);
  res.status(200).json({ schedule: updated });
});

// Toggle a single task's completion state.
router.patch("/:id/tasks/:taskId", (req, res) => {
  const { id, taskId } = req.params;
  const { completed } = req.body as { completed?: unknown };

  if (typeof completed !== "boolean") {
    res.status(400).json({ error: "completed (boolean) is required" });
    return;
  }

  const schedule = readSchedule(id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const task = schedule.tasks?.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  task.completed = completed;
  schedule.updatedAt = new Date().toISOString();
  writeSchedule(schedule);
  res.status(200).json({ schedule });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getSchedulesDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

export default router;
