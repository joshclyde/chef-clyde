import { MessageSquare, Settings, type LucideIcon } from "lucide-react";
import { type ComponentType } from "react";
import { ChatTab } from "./tabs/ChatTab";
import { SettingsTab } from "./tabs/SettingsTab";

export type PanelTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
};

/** Registry of Panel tabs. Add a surface by appending an entry here. */
export const panelTabs: PanelTab[] = [
  { id: "chat", label: "Chat", icon: MessageSquare, component: ChatTab },
  { id: "settings", label: "Settings", icon: Settings, component: SettingsTab },
];
