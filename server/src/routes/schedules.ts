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

  const updated: Schedule = {
    ...schedule,
    date,
    content: content.trim(),
    updatedAt: new Date().toISOString(),
  };
  writeSchedule(updated);
  res.status(200).json({ schedule: updated });
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
