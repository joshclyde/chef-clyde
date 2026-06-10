import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatMode } from "../types/chat";

const anthropic = new Anthropic();

const NEW_RECIPE_SYSTEM_PROMPT =
  "You are a creative and knowledgeable chef assistant for Chef Clyde. " +
  "The user is planning their grocery shopping for the week and can buy any ingredients they need. " +
  "Help them discover and create delicious new recipes using any ingredients available at a grocery store. " +
  "When asked for a recipe, provide clear ingredients with measurements and step-by-step cooking instructions. " +
  "You can also help with ingredient substitutions, scaling, and cooking tips.";

const GENERAL_SYSTEM_PROMPT =
  "You are Chef Clyde, a friendly and knowledgeable kitchen assistant. " +
  "Help the user with whatever they're working on — cooking questions, meal ideas, " +
  "techniques, planning, or general kitchen advice. " +
  "Be concise and practical, and when you give a recipe include clear measurements and steps.";

function buildPantrySystemPrompt(pantry: string): string {
  const pantrySection = pantry.trim()
    ? `Here are the ingredients currently in their pantry:\n\n${pantry.trim()}`
    : "Their pantry appears to be empty or has not been set up yet.";

  return (
    "You are a practical and resourceful chef assistant for Chef Clyde. " +
    "The user needs to cook using only what they already have at home — they are NOT going to the grocery store. " +
    pantrySection +
    "\n\nCreate recipes using ONLY these pantry ingredients. " +
    "Do not suggest recipes that require ingredients not listed above. " +
    "If the pantry is limited, get creative with what is available. " +
    "When asked for a recipe, provide clear ingredients with measurements and step-by-step cooking instructions."
  );
}

function readPantry(): string {
  const filePath = path.join(process.env.DB_PATH!, "pantry.json");
  if (!fs.existsSync(filePath)) return "";
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    pantry: string;
  };
  return data.pantry ?? "";
}

export async function generateChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  mode: ChatMode,
): Promise<string> {
  let systemPrompt: string;

  if (mode === "pantry-recipe") {
    const pantry = readPantry();
    systemPrompt = buildPantrySystemPrompt(pantry);
  } else if (mode === "general") {
    systemPrompt = GENERAL_SYSTEM_PROMPT;
  } else {
    systemPrompt = NEW_RECIPE_SYSTEM_PROMPT;
  }

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8096,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}
