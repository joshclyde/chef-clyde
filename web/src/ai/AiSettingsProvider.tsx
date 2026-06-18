import { type ReactNode, useEffect, useState } from "react";

import {
  AI_EFFORT_OPTIONS,
  AI_EFFORT_STORAGE_KEY,
  AI_MODEL_OPTIONS,
  AI_MODEL_STORAGE_KEY,
  type AiEffort,
  type AiModel,
  AiSettingsContext,
  type AiUsage,
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
} from "./AiSettingsContext";

function getInitialModel(): AiModel {
  const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
  return AI_MODEL_OPTIONS.some((m) => m.id === stored)
    ? (stored as AiModel)
    : DEFAULT_MODEL;
}

function getInitialEffort(): AiEffort {
  const stored = localStorage.getItem(AI_EFFORT_STORAGE_KEY);
  return AI_EFFORT_OPTIONS.some((e) => e.id === stored)
    ? (stored as AiEffort)
    : DEFAULT_EFFORT;
}

/**
 * App-global AI settings: the model + effort the user picks (persisted, like
 * AiMotionProvider) and the token usage of the most recent AI response (live
 * only). The controls live in the chat side panel, but every AI call — chat,
 * recipe extraction, schedule generation/editing — reads these settings.
 */
export function AiSettingsProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<AiModel>(getInitialModel);
  const [effort, setEffort] = useState<AiEffort>(getInitialEffort);
  const [lastUsage, setLastUsage] = useState<AiUsage | null>(null);

  useEffect(() => {
    localStorage.setItem(AI_MODEL_STORAGE_KEY, model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem(AI_EFFORT_STORAGE_KEY, effort);
  }, [effort]);

  return (
    <AiSettingsContext.Provider
      value={{ model, effort, setModel, setEffort, lastUsage, setLastUsage }}
    >
      {children}
    </AiSettingsContext.Provider>
  );
}
