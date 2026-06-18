import { type ComponentType } from "react";

import { type AiEffort, type AiModel } from "../../ai/AiSettingsContext";
import { SaveRecipeAction } from "./SaveRecipeAction";
import { type ChatMode, type Message, MODE_CONFIG } from "./types";

/** The model + effort the user picked, merged into every AI request body. */
export type ChatSettings = { model: AiModel; effort: AiEffort };

export type ModeOption = {
  id: ChatMode;
  label: string;
  hint: string;
  placeholder: string;
};

export type ChatConfig = {
  /** Endpoint the composer POSTs to. */
  endpoint: string;
  /** Build the request body for a turn. */
  buildBody: (
    messages: Message[],
    mode: ChatMode,
    settings: ChatSettings,
  ) => unknown;
  /** Mode toggle buttons shown before the first message. */
  modes?: ModeOption[];
  /** Mode the chat starts in (passed to buildBody). */
  defaultMode: ChatMode;
  /** Helper text shown before the first message (when there are no modes). */
  emptyHint: string;
  /** Placeholder for the first message (when there are no modes). */
  placeholder: string;
  /** Placeholder once the conversation is underway. */
  continuePlaceholder: string;
  /** Optional save UI rendered under the latest assistant reply. */
  SaveAction?: ComponentType<{ messages: Message[] }>;
};

const COOKBOOK_CONFIG: ChatConfig = {
  endpoint: "/api/chat",
  buildBody: (messages, mode, settings) => ({ messages, mode, ...settings }),
  modes: [
    { id: "new-recipe", ...MODE_CONFIG["new-recipe"] },
    { id: "pantry-recipe", ...MODE_CONFIG["pantry-recipe"] },
  ],
  defaultMode: "new-recipe",
  emptyHint: MODE_CONFIG["new-recipe"].hint,
  placeholder: MODE_CONFIG["new-recipe"].placeholder,
  continuePlaceholder: "Continue the conversation...",
  SaveAction: SaveRecipeAction,
};

const DEFAULT_CONFIG: ChatConfig = {
  endpoint: "/api/chat",
  buildBody: (messages, _mode, settings) => ({
    messages,
    mode: "general",
    ...settings,
  }),
  defaultMode: "general",
  emptyHint: "Ask me anything — I'm your Chef Clyde assistant.",
  placeholder: "e.g. How do I dice an onion without crying?",
  continuePlaceholder: "Continue the conversation...",
};

const CONFIG_BY_ACTIVITY: Record<string, ChatConfig> = {
  cookbook: COOKBOOK_CONFIG,
};

/** Resolve the chat experience for an activity, falling back to a generic assistant. */
export function chatConfigForActivity(activityId: string): ChatConfig {
  return CONFIG_BY_ACTIVITY[activityId] ?? DEFAULT_CONFIG;
}
