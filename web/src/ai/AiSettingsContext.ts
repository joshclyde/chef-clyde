import { createContext } from "react";

/** The Claude model the user picks for AI calls. Kept in sync with the server's
 * `AI_MODELS` allowlist in server/src/services/aiOptions.ts. */
export type AiModel =
  | "claude-opus-4-8"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

/** How hard the model thinks. Not sent for models without effort support. */
export type AiEffort = "low" | "medium" | "high";

/** Token counts surfaced from a response's `usage` field. */
export type AiUsage = { input_tokens: number; output_tokens: number };

export type AiModelOption = { id: AiModel; label: string; effort: boolean };

/** Offered models — mirror the server allowlist (incl. effort support). */
export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: "claude-opus-4-8", label: "Opus 4.8", effort: true },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", effort: true },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", effort: false },
];

export const AI_EFFORT_OPTIONS: { id: AiEffort; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export const DEFAULT_MODEL: AiModel = "claude-sonnet-4-6";
export const DEFAULT_EFFORT: AiEffort = "medium";

export const AI_MODEL_STORAGE_KEY = "chef-clyde-ai-model";
export const AI_EFFORT_STORAGE_KEY = "chef-clyde-ai-effort";

export type AiSettingsContextValue = {
  model: AiModel;
  effort: AiEffort;
  setModel: (model: AiModel) => void;
  setEffort: (effort: AiEffort) => void;
  /** Usage from the most recent AI response, or null before the first call. */
  lastUsage: AiUsage | null;
  setLastUsage: (usage: AiUsage | null) => void;
};

export const AiSettingsContext = createContext<AiSettingsContextValue | null>(
  null,
);

/** Whether the given model accepts an effort level (false → effort omitted). */
export function modelSupportsEffort(model: AiModel): boolean {
  return AI_MODEL_OPTIONS.find((m) => m.id === model)?.effort ?? false;
}
