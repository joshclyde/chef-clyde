import { createContext } from "react";

/** Whether the iridescent AI surfaces animate ("on") or stay static ("off"). */
export type AiMotion = "on" | "off";

export type AiMotionContextValue = {
  motion: AiMotion;
  setMotion: (motion: AiMotion) => void;
  toggle: () => void;
};

export const AiMotionContext = createContext<AiMotionContextValue | null>(null);

export const AI_MOTION_STORAGE_KEY = "chef-clyde-ai-motion";
