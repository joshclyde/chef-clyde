import { useContext } from "react";

import { AiSettingsContext } from "./AiSettingsContext";

export function useAiSettings() {
  const context = useContext(AiSettingsContext);
  if (!context) {
    throw new Error("useAiSettings must be used within an AiSettingsProvider");
  }
  return context;
}
