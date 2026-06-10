import { createContext } from "react";

export type PanelPosition = "right" | "bottom";

export type PanelContextValue = {
  open: boolean;
  position: PanelPosition;
  activeTab: string;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setPosition: (position: PanelPosition) => void;
  togglePosition: () => void;
  setActiveTab: (tab: string) => void;
};

export const PanelContext = createContext<PanelContextValue | null>(null);

export const PANEL_OPEN_KEY = "chef-clyde-panel-open";
export const PANEL_POSITION_KEY = "chef-clyde-panel-position";
export const PANEL_TAB_KEY = "chef-clyde-panel-tab";
