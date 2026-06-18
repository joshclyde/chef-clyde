import Anthropic from "@anthropic-ai/sdk";

import type { Recipe } from "../types/recipe";
import {
  type AiOptions,
  type AiUsage,
  buildModelParams,
  MOCK_USAGE,
  toUsage,
} from "./aiOptions";

const anthropic = new Anthropic();

/**
 * JSON Schema for `output_config.format` so the extractor returns schema-valid
 * JSON. The `anyOf` keeps the existing "no recipe found" signal — the model can
 * emit `{ "error": "no_recipe_found" }` instead of a recipe.
 */
const RECIPE_OUTPUT_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        servings: { type: "number" },
        prepTime: { type: "integer" },
        cookTime: { type: "integer" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              amount: { type: "string" },
              unit: { type: "string" },
              name: { type: "string" },
              notes: { type: "string" },
            },
            required: ["amount", "unit", "name"],
            additionalProperties: false,
          },
        },
        steps: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
      },
      required: [
        "name",
        "description",
        "servings",
        "prepTime",
        "cookTime",
        "ingredients",
        "steps",
      ],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: { error: { type: "string", const: "no_recipe_found" } },
      required: ["error"],
      additionalProperties: false,
    },
  ],
};

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

type ExtractionSuccess = {
  recipe: Omit<Recipe, "id" | "savedAt">;
  usage: AiUsage;
};
type ExtractionError = { error: string };

export async function extractRecipe(
  messages: { role: "user" | "assistant"; content: string }[],
  opts: AiOptions,
): Promise<ExtractionSuccess | ExtractionError> {
  const extractionMessages = [
    ...messages,
    { role: "user" as const, content: EXTRACTION_USER_MESSAGE },
  ];

  let rawText: string;
  let usage: AiUsage = MOCK_USAGE;

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
        {
          amount: "1",
          unit: "handful",
          name: "fresh parsley",
          notes: "chopped",
        },
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
        ...buildModelParams(opts, RECIPE_OUTPUT_SCHEMA),
        max_tokens: 2048,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: extractionMessages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      rawText = textBlock?.text ?? "";
      usage = toUsage(response.usage);
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

  return { recipe: parsed as Omit<Recipe, "id" | "savedAt">, usage };
}
