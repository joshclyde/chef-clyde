import fs from "fs";
import path from "path";
import type { Recipe } from "../types/recipe";

export function getRecipesDir(): string {
  const dir = path.join(process.env.DB_PATH!, "recipes");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getSoftDeleteDir(): string {
  const dir = path.join(process.env.DB_PATH!, "soft-deletion", "recipes");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readAllRecipes(): Recipe[] {
  const dir = getRecipesDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Recipe,
    );
}

export function readRecipe(id: string): Recipe | null {
  const filePath = path.join(getRecipesDir(), `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Recipe;
}

export function writeRecipe(recipe: Recipe): void {
  const dir = getRecipesDir();
  fs.writeFileSync(
    path.join(dir, `${recipe.id}.json`),
    JSON.stringify(recipe, null, 2),
  );
}
