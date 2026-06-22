import {
  BrushCleaning,
  CalendarDays,
  ChefHat,
  Gamepad2,
  Info,
  ListTodo,
  type LucideIcon,
  Repeat2,
  Settings,
} from "lucide-react";

export type NavItem = { label: string; path: string; end?: boolean };

export type Activity = {
  id: string;
  label: string;
  icon: LucideIcon;
  navItems: NavItem[];
};

export const activities: Activity[] = [
  {
    id: "meta",
    label: "About this instance",
    icon: Info,
    navItems: [{ label: "Overview", path: "/meta" }],
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    navItems: [
      { label: "Daily", path: "/schedule/daily" },
      { label: "Today (v2)", path: "/schedule/today" },
      { label: "Saved", path: "/schedule/saved" },
      { label: "Instructions", path: "/schedule/instructions" },
    ],
  },
  {
    id: "chores",
    label: "Chores",
    icon: BrushCleaning,
    navItems: [
      { label: "Dashboard", path: "/chores/dashboard" },
      { label: "Tasks", path: "/chores/tasks" },
    ],
  },
  {
    id: "hobbies",
    label: "Hobbies",
    icon: Gamepad2,
    navItems: [
      { label: "Dashboard", path: "/hobbies/dashboard" },
      { label: "List", path: "/hobbies/list" },
    ],
  },
  {
    id: "routines",
    label: "Routines",
    icon: Repeat2,
    navItems: [
      { label: "Breakdown", path: "/routines/breakdown" },
      { label: "Manage", path: "/routines/manage" },
    ],
  },
  {
    id: "todos",
    label: "To-Dos",
    icon: ListTodo,
    navItems: [{ label: "All", path: "/todos" }],
  },
  {
    id: "cookbook",
    label: "Cookbook",
    icon: ChefHat,
    navItems: [
      { label: "Recipes", path: "/recipes" },
      { label: "Pantry", path: "/pantry" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    navItems: [{ label: "Settings", path: "/settings" }],
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
