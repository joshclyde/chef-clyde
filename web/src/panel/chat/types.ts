export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMode = "new-recipe" | "pantry-recipe" | "general";

export type ModeInfo = { label: string; hint: string; placeholder: string };

/** Metadata for the recipe modes the Cookbook chat exposes as toggle buttons. */
export const MODE_CONFIG: Record<"new-recipe" | "pantry-recipe", ModeInfo> = {
  "new-recipe": {
    label: "New Recipe Creator",
    hint: "Plan your meals — I'll create recipes you can shop for.",
    placeholder: "e.g. Make me a pasta recipe with mushrooms...",
  },
  "pantry-recipe": {
    label: "Pantry Recipe Creator",
    hint: "I'll build a recipe from what's already in your pantry.",
    placeholder: "e.g. What can I make for dinner tonight?",
  },
};
