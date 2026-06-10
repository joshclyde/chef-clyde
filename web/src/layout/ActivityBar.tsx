import { Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../theme/useTheme";
import { cn } from "../ui/cn";
import { activities, type Activity } from "./activities";
import styles from "./ActivityBar.module.css";

type ActivityBarProps = {
  activeActivity: Activity;
};

export function ActivityBar({ activeActivity }: ActivityBarProps) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

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
        className={cn(styles.item, styles.themeToggle)}
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
