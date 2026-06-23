import {
  BrushCleaning,
  Circle,
  Gamepad2,
  ListTodo,
  type LucideIcon,
  Repeat2,
} from "lucide-react";

import type {
  ScheduleItem,
  ScheduleItemCategory,
} from "../../lib/scheduleItems";
import type { ScheduleTask } from "./useSchedules";

/** The lucide icon representing each linkable item category. */
export const CATEGORY_ICON: Record<ScheduleItemCategory, LucideIcon> = {
  chore: BrushCleaning,
  todo: ListTodo,
  hobby: Gamepad2,
  routine: Repeat2,
};

/**
 * The icon representing a task: the icon for its linked item's category, or a
 * neutral bullet for a task that isn't linked to one of the user's items.
 */
export function taskIcon(task: ScheduleTask, items: ScheduleItem[]): LucideIcon {
  if (!task.itemId) return Circle;
  const item = items.find((i) => i.id === task.itemId);
  return CATEGORY_ICON[item?.category ?? "chore"];
}
