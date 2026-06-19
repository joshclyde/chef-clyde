/**
 * One-time migration: fold the old per-entity collections (chores, hobbies,
 * routines, todos) into the unified `schedule-items/` collection, and rewrite
 * saved schedules' task links from the four `*Id` fields to a single `itemId`.
 *
 * Existing ids are reused as the new item id (a chore/routine/todo keeps its id;
 * each hobby *task* becomes an item keyed by that task's id), so a schedule's
 * choreId/todoId/hobbyTaskId/routineId already equals the new itemId.
 *
 * Safe to run more than once: item files are written only when absent (pass
 * --force to overwrite), and schedule tasks already migrated are left alone.
 *
 * Usage (from server/):
 *   npm run db:backup        # ALWAYS back up production first
 *   node --env-file=.env -r ts-node/register src/scripts/migrateScheduleItems.ts
 *   ... -- --force           # overwrite existing schedule-item files
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

import type {
  Completion,
  DayOfWeek,
  FrequencyUnit,
  Occurrence,
  ScheduleItem,
  TimeOfDay,
} from "../types/scheduleItem";

// The pre-migration record shapes, declared locally since their type files are
// removed once the migration ships.
type OldOccurrence =
  | { kind: "event"; date: string; startTime?: string; endTime?: string }
  | { kind: "weekly"; days: DayOfWeek[]; timeOfDay?: TimeOfDay }
  | { kind: "frequency"; value: number; unit: FrequencyUnit }
  | { kind: "oneoff" };

type OldChore = {
  id: string;
  name: string;
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  typicalTimeMinutes?: number;
  room?: string;
  floor?: string;
  completions: Completion[];
  createdAt: string;
  updatedAt: string;
};

type OldHobbyTask = {
  id: string;
  label: string;
  typicalTimeMinutes?: number;
  occurrence: OldOccurrence;
  completions: Completion[];
};

type OldHobby = {
  id: string;
  name: string;
  notes?: string;
  tasks: OldHobbyTask[];
  createdAt: string;
  updatedAt: string;
};

type OldRoutine = {
  id: string;
  label: string;
  timeOfDay: TimeOfDay;
  typicalTimeMinutes?: number;
  occurrence:
    | { kind: "weekly"; days: DayOfWeek[] }
    | { kind: "frequency"; value: number; unit: FrequencyUnit };
  completions: Completion[];
  createdAt: string;
  updatedAt: string;
};

type OldTodo = {
  id: string;
  title: string;
  dueDate?: string;
  notes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** A saved schedule task, in either the old (four-link) or new (itemId) shape. */
type AnyTask = {
  id: string;
  startTime: string;
  endTime: string | null;
  label: string;
  status: string;
  notes?: string;
  choreId?: string;
  choreCompletionId?: string;
  todoId?: string;
  todoCompletionAt?: string;
  hobbyTaskId?: string;
  hobbyTaskCompletionId?: string;
  routineId?: string;
  routineCompletionId?: string;
  itemId?: string;
  itemCompletionId?: string;
};

function readJsonDir<T>(dir: string): { name: string; record: T }[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((name) => ({
      name,
      record: JSON.parse(fs.readFileSync(path.join(dir, name), "utf-8")) as T,
    }));
}

function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) delete obj[key];
  }
  return obj;
}

/** Split an old occurrence into the stored occurrence + item-level time-of-day. */
function splitOccurrence(occ: OldOccurrence): {
  occurrence: Occurrence;
  timeOfDay?: TimeOfDay;
} {
  if (occ.kind === "weekly") {
    return { occurrence: { kind: "weekly", days: occ.days }, timeOfDay: occ.timeOfDay };
  }
  return { occurrence: occ };
}

function main(): void {
  const dbPath = process.env.DB_PATH;
  if (!dbPath) throw new Error("DB_PATH environment variable is not set");
  const force = process.argv.slice(2).includes("--force");

  const itemsDir = path.join(dbPath, "schedule-items");
  fs.mkdirSync(itemsDir, { recursive: true });

  const writeItem = (item: ScheduleItem): boolean => {
    const dest = path.join(itemsDir, `${item.id}.json`);
    if (!force && fs.existsSync(dest)) return false;
    fs.writeFileSync(dest, JSON.stringify(pruneUndefined({ ...item }), null, 2));
    return true;
  };

  let written = 0;

  // Chores → frequency items.
  for (const { record: c } of readJsonDir<OldChore>(path.join(dbPath, "chores"))) {
    const item: ScheduleItem = {
      id: c.id,
      category: "chore",
      label: c.name,
      occurrence: { kind: "frequency", value: c.frequencyValue, unit: c.frequencyUnit },
      completions: c.completions ?? [],
      typicalTimeMinutes: c.typicalTimeMinutes,
      details: pruneUndefined({ room: c.room, floor: c.floor }),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
    if (writeItem(item)) written++;
  }

  // Routines → items (timeOfDay lifted to the item level).
  for (const { record: r } of readJsonDir<OldRoutine>(path.join(dbPath, "routines"))) {
    const item: ScheduleItem = {
      id: r.id,
      category: "routine",
      label: r.label,
      occurrence: r.occurrence,
      completions: r.completions ?? [],
      typicalTimeMinutes: r.typicalTimeMinutes,
      timeOfDay: r.timeOfDay,
      details: {},
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
    if (writeItem(item)) written++;
  }

  // To-dos → one-off items; completedAt becomes the single completion. Remember
  // each todo's new completion so schedules can point itemCompletionId at it.
  const todoCompletion = new Map<string, string>(); // todoId -> completion id
  for (const { record: t } of readJsonDir<OldTodo>(path.join(dbPath, "todos"))) {
    const completions: Completion[] = [];
    if (t.completedAt) {
      const completion: Completion = {
        id: crypto.randomUUID(),
        performedAt: t.completedAt,
      };
      completions.push(completion);
      todoCompletion.set(t.id, completion.id);
    }
    const item: ScheduleItem = {
      id: t.id,
      category: "todo",
      label: t.title,
      occurrence: { kind: "oneoff" },
      completions,
      notes: t.notes,
      details: pruneUndefined({ dueDate: t.dueDate }),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
    if (writeItem(item)) written++;
  }

  // Hobbies → one item per task, keyed by the task id, grouped by hobby name.
  for (const { record: h } of readJsonDir<OldHobby>(path.join(dbPath, "hobbies"))) {
    for (const task of h.tasks) {
      const { occurrence, timeOfDay } = splitOccurrence(task.occurrence);
      const item: ScheduleItem = {
        id: task.id,
        category: "hobby",
        label: task.label,
        occurrence,
        completions: task.completions ?? [],
        typicalTimeMinutes: task.typicalTimeMinutes,
        notes: h.notes,
        timeOfDay,
        details: { groupLabel: h.name },
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
      };
      if (writeItem(item)) written++;
    }
  }

  // Rewrite saved schedules' task links onto the single itemId/itemCompletionId.
  let schedulesUpdated = 0;
  const schedulesDir = path.join(dbPath, "schedules");
  for (const { name, record } of readJsonDir<{ tasks?: AnyTask[] }>(schedulesDir)) {
    if (!record.tasks || record.tasks.length === 0) continue;
    let changed = false;
    record.tasks = record.tasks.map((task) => {
      const itemId =
        task.choreId ?? task.todoId ?? task.hobbyTaskId ?? task.routineId;
      // Already migrated (or never linked) — leave it untouched.
      if (itemId === undefined && task.todoCompletionAt === undefined) {
        return task;
      }
      const itemCompletionId =
        task.choreCompletionId ??
        task.hobbyTaskCompletionId ??
        task.routineCompletionId ??
        (task.todoId ? todoCompletion.get(task.todoId) : undefined);

      const next: AnyTask = { ...task, itemId, itemCompletionId };
      for (const key of [
        "choreId",
        "choreCompletionId",
        "todoId",
        "todoCompletionAt",
        "hobbyTaskId",
        "hobbyTaskCompletionId",
        "routineId",
        "routineCompletionId",
      ] as const) {
        delete next[key];
      }
      changed = true;
      return pruneUndefined(next);
    });
    if (changed) {
      fs.writeFileSync(
        path.join(schedulesDir, name),
        JSON.stringify(record, null, 2),
      );
      schedulesUpdated++;
    }
  }

  console.log(
    `Migration complete: wrote ${written} schedule item(s), updated ${schedulesUpdated} schedule(s).\n` +
      `The old chores/hobbies/routines/todos directories under ${dbPath} are now unused and can be removed.`,
  );
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
