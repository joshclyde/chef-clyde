import Anthropic from "@anthropic-ai/sdk";

import { readScheduleInstructions } from "../db/scheduleInstructions";
import { readAllSchedules } from "../db/schedules";
import type { Chore, Completion, FrequencyUnit } from "../types/chore";
import type { DayOfWeek, Hobby } from "../types/hobby";
import type { Routine } from "../types/routine";
import type { TaskStatus } from "../types/schedule";
import type { Todo } from "../types/todo";
import {
  buildChoreLinkingInstructions,
  buildHobbyLinkingInstructions,
  buildRoutineLinkingInstructions,
  buildTodoLinkingInstructions,
  MOCK_TASKS,
  type ParseError,
  type ParseSuccess,
  TASK_JSON_SCHEMA,
  validateTasks,
} from "./scheduleParser";

const anthropic = new Anthropic();

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

function lastPerformed(chore: Chore): Date | null {
  if (chore.completions.length === 0) return null;
  const latest = Math.max(
    ...chore.completions.map((c) => new Date(c.performedAt).getTime()),
  );
  return new Date(latest);
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

/**
 * Format every chore as a single line describing its cadence, location, time
 * estimate, and — most importantly — whether it is ready to be performed
 * (overdue / due now / upcoming), so the model can prioritize the day.
 */
function buildChoresContext(chores: Chore[]): string {
  if (chores.length === 0) {
    return "The user has no chores recorded.";
  }

  const lines = chores.map((chore) => {
    const parts = [
      `${chore.name} — every ${chore.frequencyValue} ${chore.frequencyUnit}`,
    ];
    if (chore.typicalTimeMinutes != null) {
      parts.push(`~${chore.typicalTimeMinutes} min`);
    }
    const location = [chore.room, chore.floor].filter(Boolean).join(", ");
    if (location) parts.push(location);

    const last = lastPerformed(chore);
    if (!last) {
      parts.push("never done — DUE NOW");
    } else {
      const due = addFrequency(last, chore.frequencyValue, chore.frequencyUnit);
      const status =
        startOfDay(due) < startOfDay(new Date()) ? "OVERDUE" : "upcoming";
      parts.push(`last done ${isoDate(last)}`);
      parts.push(`next due ${isoDate(due)} (${status})`);
    }

    return `- ${parts.join("; ")}`;
  });

  return `The user's chores and their readiness:\n${lines.join("\n")}`;
}

/**
 * Format every open to-do as a single line describing its deadline (or lack of
 * one) and any user note, so the model knows which one-off tasks to weave in
 * and how urgent each is. Callers pass only open (not-yet-completed) to-dos.
 */
function buildTodosContext(todos: Todo[]): string {
  if (todos.length === 0) {
    return "The user has no open one-off to-dos.";
  }

  const today = localIsoDate(new Date());
  const lines = todos.map((todo) => {
    const parts = [todo.title];
    if (!todo.dueDate) {
      parts.push("no due date");
    } else if (todo.dueDate < today) {
      parts.push(`due ${todo.dueDate} (OVERDUE)`);
    } else if (todo.dueDate === today) {
      parts.push("due today");
    } else {
      parts.push(`due ${todo.dueDate} (upcoming)`);
    }
    if (todo.notes) parts.push(`notes: ${todo.notes}`);
    return `- ${parts.join("; ")}`;
  });

  return `The user's one-off to-dos and their deadlines:\n${lines.join("\n")}`;
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

/** Most recent completion date among a list, or null if there are none. */
function latestCompletion(completions: Completion[]): Date | null {
  if (completions.length === 0) return null;
  const latest = Math.max(
    ...completions.map((c) => new Date(c.performedAt).getTime()),
  );
  return new Date(latest);
}

/**
 * Hobby tasks of kind "event" that fall on the planned day. These are booked at
 * specific times and must be honored exactly, so they get their own emphatic
 * section at the top of the prompt. Empty when nothing is booked that day.
 */
function buildFixedCommitmentsContext(hobbies: Hobby[], date: string): string {
  const lines: string[] = [];
  for (const hobby of hobbies) {
    for (const task of hobby.tasks) {
      const occ = task.occurrence;
      if (occ.kind !== "event" || occ.date !== date) continue;
      const time =
        occ.startTime && occ.endTime
          ? `${occ.startTime}–${occ.endTime}`
          : occ.startTime
            ? `at ${occ.startTime}`
            : "time unspecified";
      lines.push(`- ${hobby.name} — ${task.label}: ${time}`);
    }
  }
  if (lines.length === 0) return "";
  return (
    "FIXED COMMITMENTS for this day — booked at specific times. Schedule each at " +
    "EXACTLY the stated time; never move, resize, shorten, or drop them, and build " +
    `the rest of the day around them:\n${lines.join("\n")}`
  );
}

/**
 * Format the user's hobby tasks the planned day should consider: weekly tasks
 * landing on this weekday, cadence (frequency) tasks with their readiness, and
 * loose one-offs that are still open. Event tasks are handled separately by
 * `buildFixedCommitmentsContext`, so they're skipped here.
 */
function buildHobbiesContext(hobbies: Hobby[], date: string): string {
  const today = weekdayOf(date);
  const lines: string[] = [];

  for (const hobby of hobbies) {
    for (const task of hobby.tasks) {
      const occ = task.occurrence;
      const prefix = `${hobby.name} — ${task.label}`;
      const dur =
        task.typicalTimeMinutes != null
          ? ` (~${task.typicalTimeMinutes} min)`
          : "";

      if (occ.kind === "weekly") {
        if (!occ.days.includes(today)) continue;
        const tod =
          occ.timeOfDay && occ.timeOfDay !== "any"
            ? ` around ${occ.timeOfDay}`
            : "";
        lines.push(
          `- ${prefix}${dur}: recurs on ${occ.days.join("/")} — do it today${tod}.`,
        );
      } else if (occ.kind === "frequency") {
        const last = latestCompletion(task.completions);
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
        if (task.completions.length > 0) continue; // already done
        lines.push(
          `- ${prefix}${dur}: loose idea, no fixed time — weave in when there's room.`,
        );
      }
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
 * Every routine carries a time of day, so it's passed as a placement hint
 * (e.g. "around morning") to keep morning routines in the morning, etc.
 */
function buildRoutinesContext(routines: Routine[], date: string): string {
  const today = weekdayOf(date);
  const lines: string[] = [];

  for (const routine of routines) {
    const occ = routine.occurrence;
    const dur =
      routine.typicalTimeMinutes != null
        ? ` (~${routine.typicalTimeMinutes} min)`
        : "";
    const tod =
      routine.timeOfDay !== "any" ? ` around ${routine.timeOfDay}` : "";

    if (occ.kind === "weekly") {
      if (!occ.days.includes(today)) continue;
      lines.push(
        `- ${routine.label}${dur}: recurs on ${occ.days.join("/")} — do it today${tod}.`,
      );
    } else {
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
  chores: Chore[];
  todos: Todo[]; // the user's open one-off to-dos
  hobbies: Hobby[]; // the user's hobbies and their tasks
  routines: Routine[]; // the user's daily routines
};

/**
 * Assemble the full system prompt + user message that turn all of a day's
 * inputs — chores, recent history, standing instructions, and the user's
 * one-off notes — into a structured task list in a single model call. Exposed
 * on its own so the UI can show the user exactly what will be sent.
 */
export function buildSchedulePrompt({
  date,
  dayContext,
  chores,
  todos,
  hobbies,
  routines,
}: SchedulePromptInput): { system: string; userMessage: string } {
  const sections: string[] = [
    SCHEDULE_SYSTEM_PROMPT,
    `Today's date is ${isoDate(new Date())}. You are planning the schedule for ${date}.`,
  ];

  // Fixed commitments lead the prompt when present — they're non-negotiable.
  const fixedCommitments = buildFixedCommitmentsContext(hobbies, date);
  if (fixedCommitments) sections.push(fixedCommitments);

  sections.push(
    buildChoresContext(chores),
    buildTodosContext(todos),
    buildHobbiesContext(hobbies, date),
    buildRoutinesContext(routines, date),
    buildRecentTaskHistoryContext(),
  );

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

  const choreLinking = buildChoreLinkingInstructions(chores);
  if (choreLinking) sections.push(choreLinking);

  const todoLinking = buildTodoLinkingInstructions(todos);
  if (todoLinking) sections.push(todoLinking);

  const hobbyLinking = buildHobbyLinkingInstructions(hobbies);
  if (hobbyLinking) sections.push(hobbyLinking);

  const routineLinking = buildRoutineLinkingInstructions(routines);
  if (routineLinking) sections.push(routineLinking);

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
): Promise<ParseSuccess | ParseError> {
  if (process.env.MOCK_AI === "true") {
    // Link any mock task whose label mentions a chore by name, a to-do by
    // title, a hobby task by label, or a routine by label, mirroring how the
    // model would attach choreId/todoId/hobbyTaskId/routineId.
    const tasks = MOCK_TASKS.map((t) => {
      const label = t.label.toLowerCase();
      const chore = input.chores.find((c) =>
        label.includes(c.name.toLowerCase()),
      );
      if (chore) return { ...t, choreId: chore.id };
      const todo = input.todos.find((td) =>
        label.includes(td.title.toLowerCase()),
      );
      if (todo) return { ...t, todoId: todo.id };
      for (const hobby of input.hobbies) {
        const hobbyTask = hobby.tasks.find((ht) =>
          label.includes(ht.label.toLowerCase()),
        );
        if (hobbyTask) return { ...t, hobbyTaskId: hobbyTask.id };
      }
      const routine = input.routines.find((r) =>
        label.includes(r.label.toLowerCase()),
      );
      if (routine) return { ...t, routineId: routine.id };
      return t;
    });
    return { tasks };
  }

  const { system, userMessage } = buildSchedulePrompt(input);
  let rawText: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8096,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    rawText = textBlock?.text ?? "";
  } catch (error) {
    console.error("Schedule generation Anthropic error:", error);
    return { error: "Failed to generate the task list" };
  }

  return validateTasks(
    rawText,
    input.chores,
    input.todos,
    input.hobbies,
    input.routines,
  );
}
