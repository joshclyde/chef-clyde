import { type ReactNode, useEffect, useState } from "react";

import {
  AI_MOTION_STORAGE_KEY,
  type AiMotion,
  AiMotionContext,
} from "./AiMotionContext";

function getInitialMotion(): AiMotion {
  const stored = localStorage.getItem(AI_MOTION_STORAGE_KEY);
  if (stored === "on" || stored === "off") return stored;
  return "on"; // default: animated
}

export function AiMotionProvider({ children }: { children: ReactNode }) {
  const [motion, setMotion] = useState<AiMotion>(getInitialMotion);

  useEffect(() => {
    document.documentElement.setAttribute("data-ai-motion", motion);
    localStorage.setItem(AI_MOTION_STORAGE_KEY, motion);
  }, [motion]);

  const toggle = () =>
    setMotion((current) => (current === "on" ? "off" : "on"));

  return (
    <AiMotionContext.Provider value={{ motion, setMotion, toggle }}>
      {children}
    </AiMotionContext.Provider>
  );
}
