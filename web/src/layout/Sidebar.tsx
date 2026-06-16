import { NavLink } from "react-router-dom";

import { cn } from "../ui/cn";
import { type Activity } from "./activities";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  activity: Activity;
};

export function Sidebar({ activity }: SidebarProps) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.header}>{activity.label}</div>
      <ul className={styles.nav}>
        {activity.navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                cn(styles.navItem, isActive && styles.active)
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
