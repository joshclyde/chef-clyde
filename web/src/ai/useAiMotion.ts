import { useContext } from "react";

import { AiMotionContext } from "./AiMotionContext";

export function useAiMotion() {
  const context = useContext(AiMotionContext);
  if (!context) {
    throw new Error("useAiMotion must be used within an AiMotionProvider");
  }
  return context;
}
