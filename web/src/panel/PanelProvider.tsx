import { type ReactNode,useEffect, useState } from "react";

import {
  PANEL_DEFAULT_HEIGHT,
  PANEL_DEFAULT_WIDTH,
  PANEL_HEIGHT_KEY,
  PANEL_OPEN_KEY,
  PANEL_POSITION_KEY,
  PANEL_TAB_KEY,
  PANEL_WIDTH_KEY,
  PanelContext,
  type PanelPosition,
} from "./PanelContext";

function getInitialOpen(): boolean {
  const stored = localStorage.getItem(PANEL_OPEN_KEY);
  if (stored === "true" || stored === "false") return stored === "true";
  return true;
}

function getInitialPosition(): PanelPosition {
  const stored = localStorage.getItem(PANEL_POSITION_KEY);
  return stored === "bottom" ? "bottom" : "right";
}

function getInitialTab(): string {
  return localStorage.getItem(PANEL_TAB_KEY) ?? "chat";
}

function getInitialSize(key: string, fallback: number): number {
  const stored = Number(localStorage.getItem(key));
  return Number.isFinite(stored) && stored > 0 ? stored : fallback;
}

export function PanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(getInitialOpen);
  const [position, setPosition] = useState<PanelPosition>(getInitialPosition);
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [width, setWidth] = useState<number>(() =>
    getInitialSize(PANEL_WIDTH_KEY, PANEL_DEFAULT_WIDTH),
  );
  const [height, setHeight] = useState<number>(() =>
    getInitialSize(PANEL_HEIGHT_KEY, PANEL_DEFAULT_HEIGHT),
  );

  useEffect(() => {
    localStorage.setItem(PANEL_OPEN_KEY, String(open));
  }, [open]);

  useEffect(() => {
    localStorage.setItem(PANEL_POSITION_KEY, position);
  }, [position]);

  useEffect(() => {
    localStorage.setItem(PANEL_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(PANEL_WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    localStorage.setItem(PANEL_HEIGHT_KEY, String(height));
  }, [height]);

  const toggleOpen = () => setOpen((current) => !current);
  const togglePosition = () =>
    setPosition((current) => (current === "right" ? "bottom" : "right"));

  return (
    <PanelContext.Provider
      value={{
        open,
        position,
        activeTab,
        width,
        height,
        setOpen,
        toggleOpen,
        setPosition,
        togglePosition,
        setActiveTab,
        setWidth,
        setHeight,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}
