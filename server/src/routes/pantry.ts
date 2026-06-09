import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/", (_req, res) => {
  const filePath = path.join(process.env.DB_PATH!, "pantry.json");
  if (!fs.existsSync(filePath)) {
    res.json({ pantry: "" });
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    pantry: string;
  };
  res.json(data);
});

router.post("/", (req, res) => {
  const { pantry } = req.body as { pantry: string };
  if (typeof pantry !== "string") {
    res.status(400).json({ error: "pantry must be a string" });
    return;
  }
  const filePath = path.join(process.env.DB_PATH!, "pantry.json");
  fs.writeFileSync(filePath, JSON.stringify({ pantry }, null, 2));
  res.json({ success: true });
});

export default router;
