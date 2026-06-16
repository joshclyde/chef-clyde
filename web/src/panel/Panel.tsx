import { PanelBottom, PanelRight, X } from "lucide-react";

import { cn } from "../ui/cn";
import styles from "./Panel.module.css";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { panelTabs } from "./panelTabs";
import { usePanel } from "./usePanel";

export function Panel() {
  const {
    position,
    activeTab,
    width,
    height,
    setActiveTab,
    togglePosition,
    setOpen,
  } = usePanel();

  const active = panelTabs.find((tab) => tab.id === activeTab) ?? panelTabs[0];

  return (
    <section
      className={cn(styles.panel, styles[position])}
      style={position === "right" ? { width } : { height }}
      aria-label="Panel"
    >
      <PanelResizeHandle />
      <header className={styles.header}>
        <div className={styles.tabs} role="tablist">
          {panelTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  styles.tab,
                  tab.id === "chat" && styles.aiTab,
                  isActive && styles.tabActive,
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.control}
            onClick={togglePosition}
            aria-label={
              position === "right" ? "Dock to bottom" : "Dock to right"
            }
            title={position === "right" ? "Dock to bottom" : "Dock to right"}
          >
            {position === "right" ? (
              <PanelBottom size={18} strokeWidth={2} aria-hidden />
            ) : (
              <PanelRight size={18} strokeWidth={2} aria-hidden />
            )}
          </button>
          <button
            type="button"
            className={styles.control}
            onClick={() => setOpen(false)}
            aria-label="Close panel"
            title="Close panel"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>
      <div className={styles.body}>
        {panelTabs.map((tab) => {
          const TabComponent = tab.component;
          const isActive = tab.id === active.id;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              hidden={!isActive}
              className={styles.tabPanel}
            >
              <TabComponent />
            </div>
          );
        })}
      </div>
    </section>
  );
}
