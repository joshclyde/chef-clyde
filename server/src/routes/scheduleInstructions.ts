import express from "express";

import {
  readScheduleInstructions,
  writeScheduleInstructions,
} from "../db/scheduleInstructions";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ instructions: readScheduleInstructions() });
});

router.post("/", (req, res) => {
  const { instructions } = req.body as { instructions?: unknown };
  if (typeof instructions !== "string") {
    res.status(400).json({ error: "instructions must be a string" });
    return;
  }
  writeScheduleInstructions(instructions);
  res.json({ success: true });
});

export default router;
