import { useNavigate } from "react-router-dom";
import { cn } from "../ui/cn";
import { activities, type Activity } from "./activities";
import styles from "./ActivityBar.module.css";

type ActivityBarProps = {
  activeActivity: Activity;
};

export function ActivityBar({ activeActivity }: ActivityBarProps) {
  const navigate = useNavigate();

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
    </nav>
  );
}
