import { useEffect, useState, type ReactNode } from "react";
import {
  PanelContext,
  PANEL_OPEN_KEY,
  PANEL_POSITION_KEY,
  PANEL_TAB_KEY,
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

export function PanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(getInitialOpen);
  const [position, setPosition] = useState<PanelPosition>(getInitialPosition);
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    localStorage.setItem(PANEL_OPEN_KEY, String(open));
  }, [open]);

  useEffect(() => {
    localStorage.setItem(PANEL_POSITION_KEY, position);
  }, [position]);

  useEffect(() => {
    localStorage.setItem(PANEL_TAB_KEY, activeTab);
  }, [activeTab]);

  const toggleOpen = () => setOpen((current) => !current);
  const togglePosition = () =>
    setPosition((current) => (current === "right" ? "bottom" : "right"));

  return (
    <PanelContext.Provider
      value={{
        open,
        position,
        activeTab,
        setOpen,
        toggleOpen,
        setPosition,
        togglePosition,
        setActiveTab,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}
