import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import type { Note } from "../types/recipe";
import {
  getRecipesDir,
  getSoftDeleteDir,
  readAllRecipes,
  readRecipe,
  writeRecipe,
} from "../db/recipes";
import { extractRecipe } from "../services/recipeExtractor";

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({ recipes: readAllRecipes() });
});

router.post("/", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const result = await extractRecipe(messages);

  if ("error" in result) {
    const status = result.error === "Failed to extract recipe from conversation" ? 500 : 422;
    res.status(status).json({ error: result.error });
    return;
  }

  const recipe = {
    ...result.recipe,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  writeRecipe(recipe);
  res.status(201).json({ recipe });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const srcPath = path.join(getRecipesDir(), `${id}.json`);
  if (!fs.existsSync(srcPath)) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  const destPath = path.join(getSoftDeleteDir(), `${id}.json`);
  fs.renameSync(srcPath, destPath);
  res.status(200).json({ success: true });
});

router.post("/:id/notes", (req, res) => {
  const { id } = req.params;
  const { content } = req.body as { content: string };
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const recipe = readRecipe(id);
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  const now = new Date().toISOString();
  const note: Note = {
    id: crypto.randomUUID(),
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
  };
  recipe.notes = [...(recipe.notes ?? []), note];
  writeRecipe(recipe);
  res.status(201).json({ recipe });
});

router.put("/:id/notes/:noteId", (req, res) => {
  const { id, noteId } = req.params;
  const { content } = req.body as { content: string };
  if (typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const recipe = readRecipe(id);
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  const note = (recipe.notes ?? []).find((n) => n.id === noteId);
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  note.content = content.trim();
  note.updatedAt = new Date().toISOString();
  writeRecipe(recipe);
  res.status(200).json({ recipe });
});

router.delete("/:id/notes/:noteId", (req, res) => {
  const { id, noteId } = req.params;
  const recipe = readRecipe(id);
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found" });
    return;
  }
  const before = (recipe.notes ?? []).length;
  recipe.notes = (recipe.notes ?? []).filter((n) => n.id !== noteId);
  if (recipe.notes.length === before) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  writeRecipe(recipe);
  res.status(200).json({ recipe });
});

export default router;
