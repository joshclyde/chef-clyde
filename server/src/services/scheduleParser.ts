import Anthropic from "@anthropic-ai/sdk";
import type { ScheduleTask } from "../types/schedule";

const anthropic = new Anthropic();

/** The task fields the model produces; id + status are added server-side. */
export type ParsedTask = Omit<ScheduleTask, "id" | "status" | "notes">;

const PARSE_SYSTEM_PROMPT = `You are a schedule data extractor. Your only job is to read a free-text daily schedule and output a single valid JSON object that matches the schema below. Output ONLY the raw JSON — no markdown fences, no explanation, no prose before or after.

Read the schedule top to bottom and produce one task per concrete time-blocked activity, in chronological order. Ignore headers, blank lines, and any prose that is not an actual scheduled item.

Times must be 24-hour "HH:MM" strings (e.g. "07:30", "16:05"). If an item gives a range like "9:00–9:45", use the start as startTime and the end as endTime. If an item has only a single time, set endTime to null.

If no tasks can be found, output exactly this JSON:
{"error": "no_tasks_found"}

Schema:
{
  "tasks": [
    { "startTime": string ("HH:MM"), "endTime": string ("HH:MM") | null, "label": string }
  ]
}`;

const PARSE_USER_MESSAGE =
  "Extract the structured task list from the schedule above and return it as JSON matching the schema in your instructions.";

type ParseSuccess = { tasks: ParsedTask[] };
type ParseError = { error: string };

const MOCK_TASKS: ParsedTask[] = [
  { startTime: "08:00", endTime: "08:30", label: "Morning coffee and planning" },
  { startTime: "09:00", endTime: "09:45", label: "Clean the shower (overdue)" },
  { startTime: "12:00", endTime: "13:00", label: "Lunch" },
  { startTime: "16:00", endTime: "16:05", label: "Scoop attic litter (due now)" },
  { startTime: "18:00", endTime: "19:00", label: "Dinner" },
];

const TIME_PATTERN = /^\d{2}:\d{2}$/;

export async function parseScheduleTasks(
  content: string,
): Promise<ParseSuccess | ParseError> {
  let rawText: string;

  if (process.env.MOCK_AI === "true") {
    rawText = JSON.stringify({ tasks: MOCK_TASKS });
  } else {
    try {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 4096,
        system: PARSE_SYSTEM_PROMPT,
        messages: [
          { role: "user", content },
          { role: "user", content: PARSE_USER_MESSAGE },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      rawText = textBlock?.text ?? "";
    } catch (error) {
      console.error("Schedule parse Anthropic error:", error);
      return { error: "Failed to parse schedule into tasks" };
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("Schedule parse returned non-JSON:", rawText);
    return { error: "Schedule parse returned malformed response" };
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
    console.error("Schedule parse returned unexpected shape:", parsed);
    return { error: "Parsed schedule is missing a tasks array" };
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
      typeof (t as ParsedTask).label === "string",
  );
  if (!valid) {
    console.error("Schedule parse returned malformed tasks:", parsed);
    return { error: "Parsed tasks have an unexpected shape" };
  }

  return { tasks: tasks as ParsedTask[] };
}
