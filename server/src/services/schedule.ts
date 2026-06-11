import Anthropic from "@anthropic-ai/sdk";
import { readAllChores } from "../db/chores";
import { readScheduleInstructions } from "../db/scheduleInstructions";
import { readAllSchedules } from "../db/schedules";
import type { Chore, FrequencyUnit } from "../types/chore";
import type { TaskStatus } from "../types/schedule";

const anthropic = new Anthropic();

const SCHEDULE_SYSTEM_PROMPT =
  "You are a planning assistant for Chef Clyde that builds realistic, time-blocked daily schedules. " +
  "Produce a clear schedule for a single day using concrete time blocks (e.g. \"9:00–9:30\"). " +
  "Balance the user's stated goals with their household chores. " +
  "Prioritize chores that are overdue or due now, and spread the rest sensibly. " +
  "Respect each chore's typical time estimate when given, and avoid over-packing the day. " +
  "Output the schedule as plain text suitable for saving as-is.";

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
function buildChoresContext(): string {
  const chores = readAllChores();
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

export async function generateScheduleResponse(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const today = isoDate(new Date());
  let systemPrompt = `${SCHEDULE_SYSTEM_PROMPT}\n\nToday's date is ${today}.\n\n${buildChoresContext()}\n\n${buildRecentTaskHistoryContext()}`;

  // Standing, user-authored instructions that apply to every generation (e.g.
  // "sleep in until 9:00 AM every Saturday"). Appended only when non-empty.
  const instructions = readScheduleInstructions().trim();
  if (instructions) {
    systemPrompt += `\n\nThe user's standing scheduling instructions (apply these every time):\n${instructions}`;
  }

  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8096,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}
