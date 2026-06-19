import { type LucideIcon, Sparkles } from "lucide-react";
import { type ComponentType } from "react";

import { ChatTab } from "./tabs/ChatTab";

export type PanelTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
};

/** Registry of Panel tabs. Add a surface by appending an entry here. */
export const panelTabs: PanelTab[] = [
  { id: "chat", label: "Chat", icon: Sparkles, component: ChatTab },
];
