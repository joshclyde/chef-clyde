import type { FrequencyUnit } from "./useChores";

export const ROOMS = [
  "Kitchen",
  "Bathroom",
  "Bedroom",
  "Living Room",
  "Dining Room",
  "Office",
  "Laundry Room",
  "Garage",
  "Hallway",
  "Outdoor",
] as const;

export const FLOORS = [
  "Basement",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "Attic",
] as const;

export const FREQUENCY_UNITS: FrequencyUnit[] = ["days", "weeks", "months"];
