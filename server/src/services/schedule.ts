import Anthropic from "@anthropic-ai/sdk";
import { readAllChores } from "../db/chores";
import { readScheduleInstructions } from "../db/scheduleInstructions";
import type { Chore, FrequencyUnit } from "../types/chore";

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

export async function generateScheduleResponse(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string> {
  const today = isoDate(new Date());
  let systemPrompt = `${SCHEDULE_SYSTEM_PROMPT}\n\nToday's date is ${today}.\n\n${buildChoresContext()}`;

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
