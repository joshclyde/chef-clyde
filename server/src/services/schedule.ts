import Anthropic from "@anthropic-ai/sdk";

import { readScheduleInstructions } from "../db/scheduleInstructions";
import { readAllSchedules } from "../db/schedules";
import type { ScheduleTask, TaskStatus } from "../types/schedule";
import type {
  Completion,
  DayOfWeek,
  FrequencyUnit,
  ScheduleItem,
} from "../types/scheduleItem";
import {
  type AiOptions,
  type AiUsage,
  buildModelParams,
  MOCK_USAGE,
  toUsage,
} from "./aiOptions";
import {
  buildLinkingInstructions,
  EDITED_TASK_JSON_SCHEMA,
  EDITED_TASK_OUTPUT_SCHEMA,
  type EditedTask,
  type EditSuccess,
  MOCK_TASKS,
  type ParseError,
  type ParseSuccess,
  TASK_JSON_SCHEMA,
  TASK_OUTPUT_SCHEMA,
  validateEditedTasks,
  validateTasks,
} from "./scheduleParser";

const anthropic = new Anthropic();

/** A `ScheduleItem` narrowed to one category, so `details` is concrete. */
type ItemOf<C extends ScheduleItem["category"]> = Extract<
  ScheduleItem,
  { category: C }
>;

const SCHEDULE_SYSTEM_PROMPT =
  "You are a planning assistant for Chef Clyde that builds realistic, time-blocked daily schedules. " +
  'Plan a single day using concrete time blocks (e.g. "9:00–9:30"). ' +
  "Balance the user's stated goals with their household chores, one-off to-dos, and hobbies. " +
  "Any FIXED COMMITMENTS are booked at specific times and are non-negotiable: place them at exactly " +
  "their stated times and build everything else around them. " +
  "Prioritize chores that are overdue or due now, and spread the rest sensibly. " +
  "Honor the user's one-off to-dos, especially any that are overdue or due today; " +
  "undated to-dos can be woven in when there is room. " +
  "Weave in the user's hobby activities the day calls for — weekly hobby tasks on their day, " +
  "cadence-based ones when they're due, and loose hobby ideas when there is room. " +
  "Anchor the day with the user's routines — small repeating habits (e.g. brush teeth, make coffee) " +
  "placed at their stated time of day. " +
  "Respect each item's typical time estimate when given, and avoid over-packing the day.";

function addFrequency(date: Date, value: number, unit: FrequencyUnit): Date {
  const d = new Date(date);
  if (unit === "days") d.setDate(d.getDate() + value);
  else if (unit === "weeks") d.setDate(d.getDate() + value * 7);
  else d.setMonth(d.getMonth() + value);
  return d;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Local "YYYY-MM-DD" for a date. The "en-CA" locale renders ISO order in the
 * local timezone — the exact shape schedules are keyed by on the web (see
 * web/src/lib/date.ts) — so it avoids the UTC off-by-one that `isoDate` would
 * introduce when comparing against locally-keyed schedule dates.
 */
function localIsoDate(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

/** Most recent completion date among a list, or null if there are none. */
function latestCompletion(completions: Completion[]): Date | null {
  if (completions.length === 0) return null;
  const latest = Math.max(
    ...completions.map((c) => new Date(c.performedAt).getTime()),
  );
  return new Date(latest);
}

const DAY_NAMES: DayOfWeek[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/** The weekday of a "YYYY-MM-DD" string, parsed locally (no UTC shift). */
function weekdayOf(date: string): DayOfWeek {
  const [y, m, d] = date.split("-").map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
}

/** Items split by category, so each context section reads concrete `details`. */
function byCategory(items: ScheduleItem[]) {
  return {
    chores: items.filter(
      (i): i is ItemOf<"chore"> => i.category === "chore",
    ),
    todos: items.filter((i): i is ItemOf<"todo"> => i.category === "todo"),
    hobbies: items.filter(
      (i): i is ItemOf<"hobby"> => i.category === "hobby",
    ),
    routines: items.filter(
      (i): i is ItemOf<"routine"> => i.category === "routine",
    ),
  };
}

/** The display name for a hobby item — "<hobby> — <task>" when grouped. */
function hobbyName(item: ItemOf<"hobby">): string {
  return item.details.groupLabel
    ? `${item.details.groupLabel} — ${item.label}`
    : item.label;
}

/**
 * Items of kind "event" that fall on the planned day. These are booked at
 * specific times and must be honored exactly, so they get their own emphatic
 * section at the top of the prompt. Empty when nothing is booked that day.
 */
function buildFixedCommitmentsContext(
  items: ScheduleItem[],
  date: string,
): string {
  const lines: string[] = [];
  for (const item of items) {
    const occ = item.occurrence;
    if (occ.kind !== "event" || occ.date !== date) continue;
    const time =
      occ.startTime && occ.endTime
        ? `${occ.startTime}–${occ.endTime}`
        : occ.startTime
          ? `at ${occ.startTime}`
          : "time unspecified";
    const name = item.category === "hobby" ? hobbyName(item) : item.label;
    lines.push(`- ${name}: ${time}`);
  }
  if (lines.length === 0) return "";
  return (
    "FIXED COMMITMENTS for this day — booked at specific times. Schedule each at " +
    "EXACTLY the stated time; never move, resize, shorten, or drop them, and build " +
    `the rest of the day around them:\n${lines.join("\n")}`
  );
}

/**
 * Format every chore as a single line describing its cadence, location, time
 * estimate, and — most importantly — whether it is ready to be performed
 * (overdue / due now / upcoming), so the model can prioritize the day.
 */
function buildChoresSection(chores: ItemOf<"chore">[]): string {
  if (chores.length === 0) return "The user has no chores recorded.";

  const lines = chores.map((chore) => {
    const occ = chore.occurrence;
    const cadence =
      occ.kind === "frequency"
        ? `every ${occ.value} ${occ.unit}`
        : "no set cadence";
    const parts = [`${chore.label} — ${cadence}`];
    if (chore.typicalTimeMinutes != null) {
      parts.push(`~${chore.typicalTimeMinutes} min`);
    }
    const location = [chore.details.room, chore.details.floor]
      .filter(Boolean)
      .join(", ");
    if (location) parts.push(location);

    const last = latestCompletion(chore.completions);
    if (!last) {
      parts.push("never done — DUE NOW");
    } else if (occ.kind === "frequency") {
      const due = addFrequency(last, occ.value, occ.unit);
      const status =
        startOfDay(due) < startOfDay(new Date()) ? "OVERDUE" : "upcoming";
      parts.push(`last done ${isoDate(last)}`);
      parts.push(`next due ${isoDate(due)} (${status})`);
    } else {
      parts.push(`last done ${isoDate(last)}`);
    }

    return `- ${parts.join("; ")}`;
  });

  return `The user's chores and their readiness:\n${lines.join("\n")}`;
}

/**
 * Format every OPEN to-do (no completion logged) as a single line describing its
 * deadline (or lack of one) and any note, so the model knows which one-off tasks
 * to weave in and how urgent each is.
 */
function buildTodosSection(todos: ItemOf<"todo">[]): string {
  const open = todos.filter((t) => t.completions.length === 0);
  if (open.length === 0) return "The user has no open one-off to-dos.";

  const today = localIsoDate(new Date());
  const lines = open.map((todo) => {
    const parts = [todo.label];
    const due = todo.details.dueDate;
    if (!due) {
      parts.push("no due date");
    } else if (due < today) {
      parts.push(`due ${due} (OVERDUE)`);
    } else if (due === today) {
      parts.push("due today");
    } else {
      parts.push(`due ${due} (upcoming)`);
    }
    if (todo.notes) parts.push(`notes: ${todo.notes}`);
    return `- ${parts.join("; ")}`;
  });

  return `The user's one-off to-dos and their deadlines:\n${lines.join("\n")}`;
}

/**
 * Format the user's hobby items the planned day should consider: weekly tasks
 * landing on this weekday, cadence (frequency) tasks with their readiness, and
 * loose one-offs that are still open. Event items are handled separately by
 * `buildFixedCommitmentsContext`, so they're skipped here.
 */
function buildHobbiesSection(
  hobbies: ItemOf<"hobby">[],
  date: string,
): string {
  const today = weekdayOf(date);
  const lines: string[] = [];

  for (const item of hobbies) {
    const occ = item.occurrence;
    const prefix = hobbyName(item);
    const dur =
      item.typicalTimeMinutes != null ? ` (~${item.typicalTimeMinutes} min)` : "";

    if (occ.kind === "weekly") {
      if (!occ.days.includes(today)) continue;
      const tod =
        item.timeOfDay && item.timeOfDay !== "any"
          ? ` around ${item.timeOfDay}`
          : "";
      lines.push(
        `- ${prefix}${dur}: recurs on ${occ.days.join("/")} — do it today${tod}.`,
      );
    } else if (occ.kind === "frequency") {
      const last = latestCompletion(item.completions);
      if (!last) {
        lines.push(
          `- ${prefix}${dur}: every ${occ.value} ${occ.unit}; never done — DUE NOW.`,
        );
      } else {
        const due = addFrequency(last, occ.value, occ.unit);
        const status =
          startOfDay(due) < startOfDay(new Date()) ? "OVERDUE" : "upcoming";
        lines.push(
          `- ${prefix}${dur}: every ${occ.value} ${occ.unit}; last done ${isoDate(last)}; next due ${isoDate(due)} (${status}).`,
        );
      }
    } else if (occ.kind === "oneoff") {
      if (item.completions.length > 0) continue; // already done
      lines.push(
        `- ${prefix}${dur}: loose idea, no fixed time — weave in when there's room.`,
      );
    }
  }

  if (lines.length === 0) {
    return "The user has no hobby activities to consider today.";
  }
  return `The user's hobbies and what to consider today:\n${lines.join("\n")}`;
}

/**
 * Format the user's routines the planned day should anchor on: weekly routines
 * landing on this weekday and cadence (frequency) routines with their readiness.
 * Each carries a time of day, passed as a placement hint (e.g. "around morning").
 */
function buildRoutinesSection(
  routines: ItemOf<"routine">[],
  date: string,
): string {
  const today = weekdayOf(date);
  const lines: string[] = [];

  for (const routine of routines) {
    const occ = routine.occurrence;
    const dur =
      routine.typicalTimeMinutes != null
        ? ` (~${routine.typicalTimeMinutes} min)`
        : "";
    const tod =
      routine.timeOfDay && routine.timeOfDay !== "any"
        ? ` around ${routine.timeOfDay}`
        : "";

    if (occ.kind === "weekly") {
      if (!occ.days.includes(today)) continue;
      lines.push(
        `- ${routine.label}${dur}: recurs on ${occ.days.join("/")} — do it today${tod}.`,
      );
    } else if (occ.kind === "frequency") {
      const last = latestCompletion(routine.completions);
      if (!last) {
        lines.push(
          `- ${routine.label}${dur}: every ${occ.value} ${occ.unit}; never done — DUE NOW${tod}.`,
        );
      } else {
        const due = addFrequency(last, occ.value, occ.unit);
        const status =
          startOfDay(due) < startOfDay(new Date()) ? "OVERDUE" : "upcoming";
        lines.push(
          `- ${routine.label}${dur}: every ${occ.value} ${occ.unit}; last done ${isoDate(last)}; next due ${isoDate(due)} (${status})${tod}.`,
        );
      }
    }
  }

  if (lines.length === 0) {
    return "The user has no routines to anchor today.";
  }
  return `The user's routines to anchor today (place each at its time of day):\n${lines.join("\n")}`;
}

/**
 * Build the per-category readiness context from the unified item list. One
 * function over one input type, emitting the same four labeled sections the
 * model has always seen (chores, to-dos, hobbies, routines).
 */
function buildItemsContext(items: ScheduleItem[], date: string): string {
  const { chores, todos, hobbies, routines } = byCategory(items);
  return [
    buildChoresSection(chores),
    buildTodosSection(todos),
    buildHobbiesSection(hobbies, date),
    buildRoutinesSection(routines, date),
  ].join("\n\n");
}

/** Human-readable outcome for each task status, used in the history summary. */
const STATUS_WORD: Record<TaskStatus, string> = {
  completed: "done",
  wontDo: "skipped",
  future: "deferred",
  pending: "pending",
};

/**
 * Summarize the user's tasks over the last 7 days (today + the 6 prior days)
 * so the model knows what was actually done, skipped, deferred, or left
 * pending — and can plan accordingly instead of re-suggesting finished work.
 * Schedules with no parsed tasks carry no outcome signal and are skipped.
 */
export function buildRecentTaskHistoryContext(): string {
  // The 7 local dates in scope, keyed the same way schedules are stored.
  const window = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    window.add(localIsoDate(d));
  }

  const today = localIsoDate(new Date());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localIsoDate(d);
  })();

  const recent = readAllSchedules()
    .filter((s) => window.has(s.date) && s.tasks && s.tasks.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (recent.length === 0) {
    return "No task history is recorded for the last 7 days.";
  }

  const sections = recent.map((schedule) => {
    let tag: string;
    if (schedule.date === today) tag = "today";
    else if (schedule.date === yesterday) tag = "yesterday";
    else {
      // Parse as local midnight so the weekday isn't shifted by UTC.
      tag = new Date(`${schedule.date}T00:00`).toLocaleDateString("en-US", {
        weekday: "long",
      });
    }

    const lines = schedule.tasks!.map((task) => {
      const note = task.notes?.trim();
      const suffix = note ? ` — note: ${note}` : "";
      return `- [${STATUS_WORD[task.status]}] ${task.label}${suffix}`;
    });

    return `${schedule.date} (${tag}):\n${lines.join("\n")}`;
  });

  return (
    "The user's task history for the last 7 days (use it to avoid re-suggesting " +
    "things already done, respect what they skipped, and resurface anything left " +
    "pending or deferred):\n" +
    sections.join("\n\n")
  );
}

export type SchedulePromptInput = {
  date: string; // the day being planned, "YYYY-MM-DD"
  dayContext: string; // the user's one-off notes for that day
  items: ScheduleItem[]; // every scheduled item (chores, hobbies, routines, to-dos)
};

/**
 * Assemble the full system prompt + user message that turn all of a day's
 * inputs — scheduled items, recent history, standing instructions, and the
 * user's one-off notes — into a structured task list in a single model call.
 * Exposed on its own so the UI can show the user exactly what will be sent.
 */
export function buildSchedulePrompt({
  date,
  dayContext,
  items,
}: SchedulePromptInput): { system: string; userMessage: string } {
  const sections: string[] = [
    SCHEDULE_SYSTEM_PROMPT,
    `Today's date is ${isoDate(new Date())}. You are planning the schedule for ${date}.`,
  ];

  // Fixed commitments lead the prompt when present — they're non-negotiable.
  const fixedCommitments = buildFixedCommitmentsContext(items, date);
  if (fixedCommitments) sections.push(fixedCommitments);

  sections.push(buildItemsContext(items, date), buildRecentTaskHistoryContext());

  // Standing, user-authored instructions that apply to every generation (e.g.
  // "sleep in until 9:00 AM every Saturday"). Appended only when non-empty.
  const instructions = readScheduleInstructions().trim();
  if (instructions) {
    sections.push(
      `The user's standing scheduling instructions (apply these every time):\n${instructions}`,
    );
  }

  const notes = dayContext.trim();
  sections.push(
    notes
      ? `The user's notes for this specific day (one-off context to honor):\n${notes}`
      : "The user added no extra notes for this day.",
  );

  const linking = buildLinkingInstructions(items);
  if (linking) sections.push(linking);

  sections.push(TASK_JSON_SCHEMA);

  return {
    system: sections.join("\n\n"),
    userMessage: `Generate the time-blocked task list for ${date} as JSON matching the schema in your instructions.`,
  };
}

/**
 * Single-call generation: plan the day and emit the structured task list at
 * once, replacing the old generate-then-parse two-step.
 */
export async function generateScheduleTasks(
  input: SchedulePromptInput,
  opts: AiOptions,
): Promise<(ParseSuccess | ParseError) & { usage: AiUsage }> {
  if (process.env.MOCK_AI === "true") {
    // Link any mock task whose label mentions a scheduled item by its label (or,
    // for a hobby, its group name), mirroring how the model attaches itemId.
    const tasks = MOCK_TASKS.map((t) => {
      const label = t.label.toLowerCase();
      const match = input.items.find(
        (i) =>
          label.includes(i.label.toLowerCase()) ||
          (i.category === "hobby" &&
            i.details.groupLabel != null &&
            label.includes(i.details.groupLabel.toLowerCase())),
      );
      return match ? { ...t, itemId: match.id } : t;
    });
    return { tasks, usage: MOCK_USAGE };
  }

  const { system, userMessage } = buildSchedulePrompt(input);
  let rawText: string;
  let usage: AiUsage;
  try {
    const response = await anthropic.messages.create({
      ...buildModelParams(opts, TASK_OUTPUT_SCHEMA),
      max_tokens: 8096,
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    rawText = textBlock?.text ?? "";
    usage = toUsage(response.usage);
  } catch (error) {
    console.error("Schedule generation Anthropic error:", error);
    return { error: "Failed to generate the task list", usage: MOCK_USAGE };
  }

  return {
    ...validateTasks(rawText, input.items),
    usage,
  };
}

const SCHEDULE_EDIT_SYSTEM_PROMPT =
  "You are a planning assistant for Chef Clyde that edits an existing time-blocked daily schedule. " +
  "You are given the day's current task list and a single change the user wants. " +
  "Apply exactly that change — adding, removing, retiming, or relabeling tasks as needed — and return the FULL updated list. " +
  "Preserve every task the user did not ask you to touch, keeping its id, times, and label unchanged. " +
  "Keep the day realistic and in chronological order, honor any FIXED COMMITMENTS at their stated times, " +
  "and treat the chores, to-dos, hobbies, routines, and recent history below only as context for making the requested change fit sensibly.";

/** Render the day's current tasks as one JSON object per line for the prompt. */
function buildCurrentTasksContext(tasks: ScheduleTask[]): string {
  const lines = tasks.map((t) =>
    JSON.stringify({
      id: t.id,
      startTime: t.startTime,
      endTime: t.endTime,
      label: t.label,
      status: t.status,
    }),
  );
  return `The day's CURRENT task list (one task per line as JSON):\n${lines.join("\n")}`;
}

export type ScheduleEditInput = SchedulePromptInput & {
  currentTasks: ScheduleTask[]; // the day's existing tasks, as stored
  instruction: string; // the user's natural-language edit request
};

/**
 * Assemble the system prompt + user message that ask the model to apply one
 * natural-language change to an existing day and return the full updated task
 * list. Reuses the same situational context as `buildSchedulePrompt` (minus the
 * link instructions — links are preserved server-side by id). Exposed for
 * symmetry with the generator, should the UI ever want to preview it.
 */
export function buildEditPrompt({
  date,
  dayContext,
  items,
  currentTasks,
  instruction,
}: ScheduleEditInput): { system: string; userMessage: string } {
  const sections: string[] = [
    SCHEDULE_EDIT_SYSTEM_PROMPT,
    `Today's date is ${isoDate(new Date())}. You are editing the schedule for ${date}.`,
  ];

  const fixedCommitments = buildFixedCommitmentsContext(items, date);
  if (fixedCommitments) sections.push(fixedCommitments);

  sections.push(buildItemsContext(items, date), buildRecentTaskHistoryContext());

  const instructions = readScheduleInstructions().trim();
  if (instructions) {
    sections.push(
      `The user's standing scheduling instructions (apply these every time):\n${instructions}`,
    );
  }

  const notes = dayContext.trim();
  sections.push(
    notes
      ? `The user's notes for this specific day (one-off context to honor):\n${notes}`
      : "The user added no extra notes for this day.",
  );

  sections.push(buildCurrentTasksContext(currentTasks));
  sections.push(EDITED_TASK_JSON_SCHEMA);

  return {
    system: sections.join("\n\n"),
    userMessage:
      `Apply this change to the schedule for ${date}, then return the full updated task list as JSON ` +
      `matching the schema in your instructions.\n\nRequested change:\n${instruction.trim()}`,
  };
}

/** Shift an "HH:MM" time forward by `minutes`, clamped to end-of-day. */
function shiftTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60,
  ).padStart(2, "0")}`;
}

/**
 * Deterministic stand-in for the model under MOCK_AI: drop the first task,
 * lengthen the last surviving task by 45 minutes, and add a banana — enough to
 * exercise the removed / changed / added paths in the diff UI without a key.
 */
function mockEditTasks(currentTasks: ScheduleTask[]): EditSuccess {
  const kept: EditedTask[] = currentTasks.slice(1).map((t) => ({
    id: t.id,
    startTime: t.startTime,
    endTime: t.endTime,
    label: t.label,
  }));
  if (kept.length > 0) {
    const last = kept[kept.length - 1];
    kept[kept.length - 1] = {
      ...last,
      endTime: shiftTime(last.startTime, 45),
    };
  }
  const banana: EditedTask = {
    startTime: "08:00",
    endTime: "08:10",
    label: "Eat a banana",
  };
  return { tasks: [...kept, banana] };
}

/**
 * Apply one natural-language edit to a day's task list in a single model call,
 * returning the proposed full list. Task identity is carried by id so the caller
 * can keep status/links/completions on tasks that survive the edit.
 */
export async function editScheduleTasks(
  input: ScheduleEditInput,
  opts: AiOptions,
): Promise<(EditSuccess | ParseError) & { usage: AiUsage }> {
  if (process.env.MOCK_AI === "true") {
    return { ...mockEditTasks(input.currentTasks), usage: MOCK_USAGE };
  }

  const { system, userMessage } = buildEditPrompt(input);
  let rawText: string;
  let usage: AiUsage;
  try {
    const response = await anthropic.messages.create({
      ...buildModelParams(opts, EDITED_TASK_OUTPUT_SCHEMA),
      max_tokens: 8096,
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    rawText = textBlock?.text ?? "";
    usage = toUsage(response.usage);
  } catch (error) {
    console.error("Schedule edit Anthropic error:", error);
    return { error: "Failed to edit the task list", usage: MOCK_USAGE };
  }

  return {
    ...validateEditedTasks(
      rawText,
      new Set(input.currentTasks.map((t) => t.id)),
    ),
    usage,
  };
}
