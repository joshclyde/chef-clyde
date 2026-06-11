import { Moon, PanelRight, Sparkles, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import { useAiMotion } from "../ai/useAiMotion";
import { usePanel } from "../panel/usePanel";
import { cn } from "../ui/cn";
import { activities, type Activity } from "./activities";
import styles from "./ActivityBar.module.css";

type ActivityBarProps = {
  activeActivity: Activity;
};

export function ActivityBar({ activeActivity }: ActivityBarProps) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { motion, toggle: toggleMotion } = useAiMotion();
  const { open, toggleOpen } = usePanel();

  return (
    <nav className={styles.activityBar} aria-label="Activities">
      {activities.map((activity) => {
        const Icon = activity.icon;
        const isActive = activity.id === activeActivity.id;
        return (
          <button
            key={activity.id}
            type="button"
            className={cn(styles.item, isActive && styles.active)}
            aria-label={activity.label}
            aria-current={isActive ? "page" : undefined}
            title={activity.label}
            onClick={() => navigate(activity.navItems[0].path)}
          >
            <Icon size={22} strokeWidth={2} aria-hidden />
          </button>
        );
      })}
      <button
        type="button"
        className={cn(styles.item, styles.panelToggle, open && styles.active)}
        aria-label={open ? "Hide panel" : "Show panel"}
        aria-pressed={open}
        title={open ? "Hide panel" : "Show panel"}
        onClick={toggleOpen}
      >
        <PanelRight size={22} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={cn(styles.item, motion === "on" && styles.active)}
        aria-label={
          motion === "on" ? "Turn off AI motion" : "Turn on AI motion"
        }
        aria-pressed={motion === "on"}
        title={motion === "on" ? "AI motion: on" : "AI motion: off"}
        onClick={toggleMotion}
      >
        <Sparkles size={22} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={cn(styles.item)}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
        onClick={toggle}
      >
        {theme === "dark" ? (
          <Sun size={22} strokeWidth={2} aria-hidden />
        ) : (
          <Moon size={22} strokeWidth={2} aria-hidden />
        )}
      </button>
    </nav>
  );
}
