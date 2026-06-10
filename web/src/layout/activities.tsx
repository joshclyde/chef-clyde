import { BookOpen, ListChecks, type LucideIcon } from "lucide-react";

export type NavItem = { label: string; path: string; end?: boolean };

export type Activity = {
  id: string;
  label: string;
  icon: LucideIcon;
  navItems: NavItem[];
};

export const activities: Activity[] = [
  {
    id: "cookbook",
    label: "Cookbook",
    icon: BookOpen,
    navItems: [
      { label: "Chat", path: "/", end: true },
      { label: "Recipes", path: "/recipes" },
      { label: "Pantry", path: "/pantry" },
    ],
  },
  {
    id: "chores",
    label: "Chores",
    icon: ListChecks,
    navItems: [
      { label: "Tasks", path: "/chores/tasks" },
      { label: "Schedule", path: "/chores/schedule" },
    ],
  },
];

/**
 * Derive the active activity from the current URL. The activity whose navItem
 * path is the longest prefix match wins ("/" only matches exactly), so a deep
 * link or page refresh selects the correct activity. Falls back to the first.
 */
export function activityForPath(pathname: string): Activity {
  let best: { activity: Activity; length: number } | null = null;

  for (const activity of activities) {
    for (const item of activity.navItems) {
      const matches =
        item.path === "/"
          ? pathname === "/"
          : pathname === item.path || pathname.startsWith(`${item.path}/`);
      if (matches && (!best || item.path.length > best.length)) {
        best = { activity, length: item.path.length };
      }
    }
  }

  return best?.activity ?? activities[0];
}
