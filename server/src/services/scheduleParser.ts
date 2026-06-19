import type { ScheduleTask } from "../types/schedule";
import type { ScheduleItem } from "../types/scheduleItem";

/** The task fields the model produces; id + status are added server-side. */
export type ParsedTask = Omit<
  ScheduleTask,
  "id" | "status" | "notes" | "itemCompletionId"
>;

export type ParseSuccess = { tasks: ParsedTask[] };
export type ParseError = { error: string };

/**
 * A task the model returns when *editing* an existing day. Same plan fields as
 * `ParsedTask` plus an optional `id`: present (and matching a current task) to
 * keep/modify that task, absent for a brand-new task. Links are preserved
 * server-side by id, so the edit schema carries no link fields.
 */
export type EditedTask = Omit<ParsedTask, "itemId"> & { id?: string };

export type EditSuccess = { tasks: EditedTask[] };

/**
 * The JSON contract the model must follow when emitting the day's task list.
 * Shared by the generation prompt so the output always matches `validateTasks`.
 */
export const TASK_JSON_SCHEMA = `Output ONLY a single valid JSON object matching the schema below — no markdown fences, no explanation, no prose before or after.

Produce one task per concrete time-blocked activity, in chronological order. Times must be 24-hour "HH:MM" strings (e.g. "07:30", "16:05"). For a time range use the start as startTime and the end as endTime; for a single-time item set endTime to null.

If no tasks can be produced, output exactly this JSON:
{"error": "no_tasks_found"}

"itemId" is an optional link explained below the schema; include it only when a task clearly performs one of the user's scheduled items.

Schema:
{
  "tasks": [
    { "startTime": string ("HH:MM"), "endTime": string ("HH:MM") | null, "label": string, "itemId"?: string }
  ]
}`;

/**
 * The JSON contract the model must follow when *editing* an existing day's task
 * list. The model returns the full updated list; task identity is carried by
 * "id" so the server can keep status/links/completions on tasks that survive.
 * Shared by the edit prompt so the output always matches `validateEditedTasks`.
 */
export const EDITED_TASK_JSON_SCHEMA = `Output ONLY a single valid JSON object matching the schema below — no markdown fences, no explanation, no prose before or after.

Return the FULL updated task list for the day, in chronological order, after applying the user's requested change. Times must be 24-hour "HH:MM" strings (e.g. "07:30", "16:05"). For a time range use the start as startTime and the end as endTime; for a single-time item set endTime to null.

How to express the edit:
- To KEEP or MODIFY an existing task, include it with its exact "id" from the current list (adjust its startTime/endTime/label as needed).
- To ADD a new task, include it WITHOUT an "id".
- To REMOVE a task, simply leave it out of the list.
- Apply only what the user asked for: leave every other task unchanged (same id, startTime, endTime, and label).
- Do not move or re-time tasks whose current status is "completed" unless the user explicitly asks.

If the change would leave no tasks at all, output exactly this JSON:
{"error": "no_tasks_found"}

Schema:
{
  "tasks": [
    { "id"?: string (an existing task's id to keep/modify it; omit for a new task), "startTime": string ("HH:MM"), "endTime": string ("HH:MM") | null, "label": string }
  ]
}`;

/** A nullable "HH:MM" time, expressed the way structured outputs accepts. */
const NULLABLE_TIME = { anyOf: [{ type: "string" }, { type: "null" }] };

/** The `{ "error": "no_tasks_found" }` variant, shared by both task schemas. */
const NO_TASKS_ERROR = {
  type: "object",
  properties: { error: { type: "string", const: "no_tasks_found" } },
  required: ["error"],
  additionalProperties: false,
};

/**
 * JSON Schema for `output_config.format` on schedule *generation*. Mirrors the
 * prose `TASK_JSON_SCHEMA` so the model emits schema-valid JSON; `validateTasks`
 * still runs as a safety net. Includes the no-tasks error variant via `anyOf`.
 */
export const TASK_OUTPUT_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              startTime: { type: "string" },
              endTime: NULLABLE_TIME,
              label: { type: "string" },
              itemId: { type: "string" },
            },
            required: ["startTime", "endTime", "label"],
            additionalProperties: false,
          },
        },
      },
      required: ["tasks"],
      additionalProperties: false,
    },
    NO_TASKS_ERROR,
  ],
};

/**
 * JSON Schema for `output_config.format` on schedule *editing*. Same as
 * generation plus the optional `id` that carries task identity across the edit.
 */
export const EDITED_TASK_OUTPUT_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              startTime: { type: "string" },
              endTime: NULLABLE_TIME,
              label: { type: "string" },
            },
            required: ["startTime", "endTime", "label"],
            additionalProperties: false,
          },
        },
      },
      required: ["tasks"],
      additionalProperties: false,
    },
    NO_TASKS_ERROR,
  ],
};

/** A short, human-readable tag for an item, used in the linking guidance. */
function describeItem(item: ScheduleItem): string {
  const name =
    item.category === "hobby" && item.details.groupLabel
      ? `${item.details.groupLabel} — ${item.label}`
      : item.label;
  const extra =
    item.category === "todo" && item.details.dueDate
      ? ` (due ${item.details.dueDate})`
      : "";
  return `- ${item.id} :: [${item.category}] ${name}${extra}`;
}

/**
 * Linking guidance appended to the prompt so the model can attach an `itemId` to
 * any task that performs one of the user's scheduled items (a chore, hobby task,
 * routine, or one-off to-do). Empty when there are no items, so it adds no noise.
 */
export function buildLinkingInstructions(items: ScheduleItem[]): string {
  if (items.length === 0) return "";
  const list = items.map(describeItem).join("\n");
  return `The user tracks scheduled items — recurring chores, hobby tasks, daily routines, and one-off to-dos. When a task is clearly an instance of one of the items below, add an optional "itemId" field with that item's exact id. Match on meaning, not exact wording (e.g. "Clean the shower (overdue)" is the item "Clean the shower"). If none matches, omit "itemId". Never invent ids.\n\nItems (id :: [category] label):\n${list}`;
}

/** Deterministic stand-in for the model when MOCK_AI is set. */
export const MOCK_TASKS: ParsedTask[] = [
  {
    startTime: "08:00",
    endTime: "08:30",
    label: "Morning coffee and planning",
  },
  { startTime: "09:00", endTime: "09:45", label: "Clean the shower (overdue)" },
  { startTime: "12:00", endTime: "13:00", label: "Lunch" },
  { startTime: "15:00", endTime: "16:30", label: "Play pickleball" },
  {
    startTime: "16:00",
    endTime: "16:05",
    label: "Scoop attic litter (due now)",
  },
  { startTime: "18:00", endTime: "19:00", label: "Dinner" },
];

const TIME_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Parse and validate the model's raw JSON reply into a clean task list. Drops
 * any `itemId` link that doesn't point at a real item (nulls and invented ids).
 */
export function validateTasks(
  rawText: string,
  items: ScheduleItem[],
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
      // the model may emit itemId: null; sanitize drops it
      ((t as { itemId?: unknown }).itemId == null ||
        typeof (t as { itemId?: unknown }).itemId === "string"),
  );
  if (!valid) {
    console.error("Schedule generation returned malformed tasks:", parsed);
    return { error: "Generated tasks have an unexpected shape" };
  }

  // Only keep links that point at a real item — drop nulls and invented ids.
  const validItemIds = new Set(items.map((i) => i.id));
  return {
    tasks: tasks.map(({ itemId, ...rest }) => {
      const task: ParsedTask = { ...rest };
      if (typeof itemId === "string" && validItemIds.has(itemId)) {
        task.itemId = itemId;
      }
      return task;
    }),
  };
}

/**
 * Parse and validate the model's reply to an *edit* request into a clean list of
 * `EditedTask`. Keeps an `id` only when it points at a real current task (passed
 * in `currentTaskIds`); invented or null ids are dropped so those rows are
 * treated as brand-new tasks.
 */
export function validateEditedTasks(
  rawText: string,
  currentTaskIds: Set<string>,
): EditSuccess | ParseError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Schedule edit returned non-JSON:", rawText);
    return { error: "Schedule edit returned malformed response" };
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
    console.error("Schedule edit returned unexpected shape:", parsed);
    return { error: "Edited schedule is missing a tasks array" };
  }

  const valid = tasks.every(
    (t): t is EditedTask =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as EditedTask).startTime === "string" &&
      TIME_PATTERN.test((t as EditedTask).startTime) &&
      ((t as EditedTask).endTime === null ||
        (typeof (t as EditedTask).endTime === "string" &&
          TIME_PATTERN.test((t as EditedTask).endTime as string))) &&
      typeof (t as EditedTask).label === "string" &&
      // the model may emit id: null on a new task; sanitize drops it
      ((t as { id?: unknown }).id == null ||
        typeof (t as { id?: unknown }).id === "string"),
  );
  if (!valid) {
    console.error("Schedule edit returned malformed tasks:", parsed);
    return { error: "Edited tasks have an unexpected shape" };
  }

  return {
    tasks: tasks.map(({ id, startTime, endTime, label }) => {
      const task: EditedTask = { startTime, endTime, label };
      if (typeof id === "string" && currentTaskIds.has(id)) {
        task.id = id;
      }
      return task;
    }),
  };
}
