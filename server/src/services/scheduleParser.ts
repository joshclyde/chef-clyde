import type { ScheduleTask } from "../types/schedule";
import type { Chore } from "../types/chore";

/** The task fields the model produces; id + status are added server-side. */
export type ParsedTask = Omit<
  ScheduleTask,
  "id" | "status" | "notes" | "choreCompletionId"
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

Schema:
{
  "tasks": [
    { "startTime": string ("HH:MM"), "endTime": string ("HH:MM") | null, "label": string, "choreId"?: string }
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

/** Deterministic stand-in for the model when MOCK_AI is set. */
export const MOCK_TASKS: ParsedTask[] = [
  { startTime: "08:00", endTime: "08:30", label: "Morning coffee and planning" },
  { startTime: "09:00", endTime: "09:45", label: "Clean the shower (overdue)" },
  { startTime: "12:00", endTime: "13:00", label: "Lunch" },
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
      // the model may emit choreId: null; the sanitize step below drops it
      ((t as { choreId?: unknown }).choreId == null ||
        typeof (t as { choreId?: unknown }).choreId === "string"),
  );
  if (!valid) {
    console.error("Schedule generation returned malformed tasks:", parsed);
    return { error: "Generated tasks have an unexpected shape" };
  }

  // Only keep chore links that point at real chores — drop nulls and any id
  // the model invented.
  const validChoreIds = new Set(chores.map((c) => c.id));
  return {
    tasks: (tasks as ParsedTask[]).map(({ choreId, ...rest }) =>
      typeof choreId === "string" && validChoreIds.has(choreId)
        ? { ...rest, choreId }
        : rest,
    ),
  };
}
