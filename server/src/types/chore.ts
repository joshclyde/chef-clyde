export type FrequencyUnit = "days" | "weeks" | "months";

export type Completion = {
  id: string;
  performedAt: string; // ISO timestamp of when the chore was done
};

export type Chore = {
  id: string;
  name: string;
  frequencyValue: number; // e.g. 2  ("every 2 weeks")
  frequencyUnit: FrequencyUnit; // e.g. "weeks"
  typicalTimeMinutes?: number; // optional: typical time to perform
  room?: string; // optional, from a fixed list
  floor?: string; // optional, from a fixed list
  completions: Completion[];
  createdAt: string;
  updatedAt: string;
};
