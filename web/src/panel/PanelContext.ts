import { createContext, type Dispatch, type SetStateAction } from "react";

export type PanelPosition = "right" | "bottom";

export type PanelContextValue = {
  open: boolean;
  position: PanelPosition;
  activeTab: string;
  /** Panel width in px when docked right. */
  width: number;
  /** Panel height in px when docked bottom. */
  height: number;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setPosition: (position: PanelPosition) => void;
  togglePosition: () => void;
  setActiveTab: (tab: string) => void;
  setWidth: Dispatch<SetStateAction<number>>;
  setHeight: Dispatch<SetStateAction<number>>;
};

export const PanelContext = createContext<PanelContextValue | null>(null);

export const PANEL_OPEN_KEY = "chef-clyde-panel-open";
export const PANEL_POSITION_KEY = "chef-clyde-panel-position";
export const PANEL_TAB_KEY = "chef-clyde-panel-tab";
export const PANEL_WIDTH_KEY = "chef-clyde-panel-width";
export const PANEL_HEIGHT_KEY = "chef-clyde-panel-height";

export const PANEL_DEFAULT_WIDTH = 400;
export const PANEL_DEFAULT_HEIGHT = 320;
export const PANEL_MIN_WIDTH = 280;
export const PANEL_MIN_HEIGHT = 200;
