import Anthropic from "@anthropic-ai/sdk";
import type { Recipe } from "../types/recipe";

const anthropic = new Anthropic();

const EXTRACTION_SYSTEM_PROMPT = `You are a recipe data extractor. Your only job is to read a cooking conversation and output a single valid JSON object that matches the schema below. Output ONLY the raw JSON — no markdown fences, no explanation, no prose before or after.

If no complete recipe can be found in the conversation, output exactly this JSON:
{"error": "no_recipe_found"}

Schema:
{
  "name": string,
  "description": string (1-2 sentence summary),
  "servings": number,
  "prepTime": number (minutes, integer),
  "cookTime": number (minutes, integer),
  "ingredients": [{ "amount": string, "unit": string, "name": string, "notes": string (optional) }],
  "steps": [string],
  "tags": [string] (optional)
}`;

const EXTRACTION_USER_MESSAGE =
  "Based on the recipe discussed in this conversation, extract the complete recipe and return it as JSON matching the schema in your instructions. Include all ingredients and all steps.";

type ExtractionSuccess = { recipe: Omit<Recipe, "id" | "savedAt"> };
type ExtractionError = { error: string };

export async function extractRecipe(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<ExtractionSuccess | ExtractionError> {
  const extractionMessages = [
    ...messages,
    { role: "user" as const, content: EXTRACTION_USER_MESSAGE },
  ];

  let rawText: string;

  if (process.env.MOCK_AI === "true") {
    rawText = JSON.stringify({
      name: "Mock Mushroom Pasta",
      description: "A quick and earthy pasta dish with sautéed mushrooms.",
      servings: 4,
      prepTime: 10,
      cookTime: 20,
      ingredients: [
        { amount: "400", unit: "g", name: "pasta" },
        { amount: "300", unit: "g", name: "mushrooms", notes: "sliced" },
        { amount: "3", unit: "cloves", name: "garlic", notes: "minced" },
        { amount: "2", unit: "tbsp", name: "olive oil" },
        { amount: "1", unit: "handful", name: "fresh parsley", notes: "chopped" },
        { amount: "", unit: "", name: "salt and pepper" },
      ],
      steps: [
        "Cook pasta according to package instructions. Reserve 1 cup pasta water.",
        "Heat olive oil in a large pan over medium-high heat.",
        "Add mushrooms and cook until golden, about 5 minutes.",
        "Add garlic and cook 1 minute more.",
        "Toss in drained pasta with a splash of pasta water.",
        "Season with salt and pepper. Top with parsley.",
      ],
      tags: ["vegetarian", "pasta", "quick"],
    });
  } else {
    try {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 2048,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: extractionMessages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      rawText = textBlock?.text ?? "";
    } catch (error) {
      console.error("Recipe extraction Anthropic error:", error);
      return { error: "Failed to extract recipe from conversation" };
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Recipe extraction returned non-JSON:", rawText);
    return { error: "Recipe extraction returned malformed response" };
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed &&
    (parsed as { error: string }).error === "no_recipe_found"
  ) {
    return { error: "No complete recipe found in this conversation" };
  }

  const partial = parsed as Partial<Recipe>;
  if (
    typeof partial.name !== "string" ||
    !Array.isArray(partial.ingredients) ||
    !Array.isArray(partial.steps)
  ) {
    console.error("Recipe extraction returned unexpected shape:", parsed);
    return { error: "Extracted recipe is missing required fields" };
  }

  return { recipe: parsed as Omit<Recipe, "id" | "savedAt"> };
}
