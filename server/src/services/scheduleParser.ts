import type { ScheduleTask } from "../types/schedule";
import type { Chore } from "../types/chore";
import type { Todo } from "../types/todo";
import type { Hobby } from "../types/hobby";
import type { Routine } from "../types/routine";

/** The task fields the model produces; id + status are added server-side. */
export type ParsedTask = Omit<
  ScheduleTask,
  | "id"
  | "status"
  | "notes"
  | "choreCompletionId"
  | "todoCompletionAt"
  | "hobbyTaskCompletionId"
  | "routineCompletionId"
>;

export type ParseSuccess = { tasks: ParsedTask[] };
export type ParseError = { error: string };

/**
 * The JSON contract the model must follow when emitting the day's task list.
 * Shared by the generation prompt so the output always matches `validateTasks`.
 */
export const TASK_JSON_SCHEMA = `Output ONLY a single valid JSON object matching the schema below — no markdown fences, no explanation, no prose before or after.

Produce one task per concrete time-blocked activity, in chronological order. Times must be 24-hour "HH:MM" strings (e.g. "07:30", "16:05"). For a time range use the start as startTime and the end as endTime; for a single-time item set endTime to null.

If no tasks can be produced, output exactly this JSON:
{"error": "no_tasks_found"}

"choreId", "todoId", "hobbyTaskId", and "routineId" are optional links explained below the schema; include at most one of them on a task, and only when it clearly applies.

Schema:
{
  "tasks": [
    { "startTime": string ("HH:MM"), "endTime": string ("HH:MM") | null, "label": string, "choreId"?: string, "todoId"?: string, "hobbyTaskId"?: string, "routineId"?: string }
  ]
}`;

/**
 * Chore-linking guidance appended to the prompt so the model can attach a
 * choreId to any task that performs one. Empty when the user has no chores, so
 * an empty list adds no noise.
 */
export function buildChoreLinkingInstructions(chores: Chore[]): string {
  if (chores.length === 0) return "";
  const list = chores.map((c) => `- ${c.id} :: ${c.name}`).join("\n");
  return (
    `The user tracks recurring household chores. When a task is clearly an instance of one of the chores below, add an optional "choreId" field with that chore's exact id. Match on meaning, not exact wording (e.g. "Clean the shower (overdue)" is the chore "Clean the shower"). If no chore matches, omit "choreId". Never invent ids.\n\nChores (id :: name):\n${list}`
  );
}

/**
 * To-do-linking guidance appended to the prompt so the model can attach a
 * todoId to any task that fulfills one of the user's one-off to-dos. Empty when
 * the user has no open to-dos, so it adds no noise.
 */
export function buildTodoLinkingInstructions(todos: Todo[]): string {
  if (todos.length === 0) return "";
  const list = todos
    .map((t) => {
      const due = t.dueDate ? `due ${t.dueDate}` : "no due date";
      return `- ${t.id} :: ${t.title} (${due})`;
    })
    .join("\n");
  return (
    `The user also keeps one-off to-dos (separate from recurring chores). When a task fulfills one of the to-dos below, add an optional "todoId" field with that to-do's exact id. Match on meaning, not exact wording. If no to-do matches, omit "todoId". Never invent ids.\n\nTo-dos (id :: title):\n${list}`
  );
}

/**
 * Hobby-linking guidance appended to the prompt so the model can attach a
 * hobbyTaskId to any task that performs one of the user's hobby tasks. Empty
 * when the user has no hobby tasks, so it adds no noise.
 */
export function buildHobbyLinkingInstructions(hobbies: Hobby[]): string {
  const list = hobbies
    .flatMap((h) => h.tasks.map((t) => `- ${t.id} :: ${h.name} — ${t.label}`))
    .join("\n");
  if (!list) return "";
  return (
    `The user pursues hobbies, each with its own tasks (a recurring session, a booked event, a loose idea, etc.). When a task is clearly an instance of one of the hobby tasks below, add an optional "hobbyTaskId" field with that task's exact id. Match on meaning, not exact wording. If none matches, omit "hobbyTaskId". Never invent ids.\n\nHobby tasks (id :: hobby — task):\n${list}`
  );
}

/**
 * Routine-linking guidance appended to the prompt so the model can attach a
 * routineId to any task that performs one of the user's daily routines. Empty
 * when the user has no routines, so it adds no noise.
 */
export function buildRoutineLinkingInstructions(routines: Routine[]): string {
  if (routines.length === 0) return "";
  const list = routines
    .map((r) => `- ${r.id} :: ${r.label} (${r.timeOfDay})`)
    .join("\n");
  return (
    `The user keeps daily routines — small repeating things that shape the day (e.g. brush teeth, make coffee). When a task is clearly an instance of one of the routines below, add an optional "routineId" field with that routine's exact id. Match on meaning, not exact wording. If none matches, omit "routineId". Never invent ids.\n\nRoutines (id :: label (time of day)):\n${list}`
  );
}

/** Deterministic stand-in for the model when MOCK_AI is set. */
export const MOCK_TASKS: ParsedTask[] = [
  { startTime: "08:00", endTime: "08:30", label: "Morning coffee and planning" },
  { startTime: "09:00", endTime: "09:45", label: "Clean the shower (overdue)" },
  { startTime: "12:00", endTime: "13:00", label: "Lunch" },
  { startTime: "15:00", endTime: "16:30", label: "Play pickleball" },
  { startTime: "16:00", endTime: "16:05", label: "Scoop attic litter (due now)" },
  { startTime: "18:00", endTime: "19:00", label: "Dinner" },
];

const TIME_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Parse and validate the model's raw JSON reply into a clean task list. Drops
 * any chore link that doesn't point at a real chore (nulls and invented ids).
 */
export function validateTasks(
  rawText: string,
  chores: Chore[],
  todos: Todo[],
  hobbies: Hobby[],
  routines: Routine[],
): ParseSuccess | ParseError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Schedule generation returned non-JSON:", rawText);
    return { error: "Schedule generation returned malformed response" };
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed &&
    (parsed as { error: string }).error === "no_tasks_found"
  ) {
    return { error: "No tasks found in this schedule" };
  }

  const tasks = (parsed as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.error("Schedule generation returned unexpected shape:", parsed);
    return { error: "Generated schedule is missing a tasks array" };
  }

  const valid = tasks.every(
    (t): t is ParsedTask =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as ParsedTask).startTime === "string" &&
      TIME_PATTERN.test((t as ParsedTask).startTime) &&
      ((t as ParsedTask).endTime === null ||
        (typeof (t as ParsedTask).endTime === "string" &&
          TIME_PATTERN.test((t as ParsedTask).endTime as string))) &&
      typeof (t as ParsedTask).label === "string" &&
      // the model may emit choreId/todoId/hobbyTaskId: null; sanitize drops it
      ((t as { choreId?: unknown }).choreId == null ||
        typeof (t as { choreId?: unknown }).choreId === "string") &&
      ((t as { todoId?: unknown }).todoId == null ||
        typeof (t as { todoId?: unknown }).todoId === "string") &&
      ((t as { hobbyTaskId?: unknown }).hobbyTaskId == null ||
        typeof (t as { hobbyTaskId?: unknown }).hobbyTaskId === "string") &&
      ((t as { routineId?: unknown }).routineId == null ||
        typeof (t as { routineId?: unknown }).routineId === "string"),
  );
  if (!valid) {
    console.error("Schedule generation returned malformed tasks:", parsed);
    return { error: "Generated tasks have an unexpected shape" };
  }

  // Only keep links that point at real chores/to-dos/hobby tasks — drop nulls
  // and any id the model invented.
  const validChoreIds = new Set(chores.map((c) => c.id));
  const validTodoIds = new Set(todos.map((t) => t.id));
  const validHobbyTaskIds = new Set(
    hobbies.flatMap((h) => h.tasks.map((t) => t.id)),
  );
  const validRoutineIds = new Set(routines.map((r) => r.id));
  return {
    tasks: (tasks as ParsedTask[]).map(
      ({ choreId, todoId, hobbyTaskId, routineId, ...rest }) => {
        const task: ParsedTask = { ...rest };
        if (typeof choreId === "string" && validChoreIds.has(choreId)) {
          task.choreId = choreId;
        }
        if (typeof todoId === "string" && validTodoIds.has(todoId)) {
          task.todoId = todoId;
        }
        if (
          typeof hobbyTaskId === "string" &&
          validHobbyTaskIds.has(hobbyTaskId)
        ) {
          task.hobbyTaskId = hobbyTaskId;
        }
        if (typeof routineId === "string" && validRoutineIds.has(routineId)) {
          task.routineId = routineId;
        }
        return task;
      },
    ),
  };
}
