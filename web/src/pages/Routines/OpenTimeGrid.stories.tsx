import type { Meta, StoryObj } from "@storybook/react-vite";

import OpenTimeGrid from "./OpenTimeGrid";
import type { Routine, RoutineOccurrence, TimeOfDay } from "./useRoutines";

function routine(
  id: string,
  label: string,
  timeOfDay: TimeOfDay,
  occurrence: RoutineOccurrence,
): Routine {
  return {
    id,
    label,
    timeOfDay,
    occurrence,
    completions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const meta = {
  title: "Routines/OpenTimeGrid",
  component: OpenTimeGrid,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1000 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OpenTimeGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No routines yet — every slot reads as open. */
export const Empty: Story = {
  args: { routines: [] },
};

/** A realistic week: mornings and nights filled, middays wide open. */
export const PartiallyFilled: Story = {
  args: {
    routines: [
      routine("coffee", "Make coffee", "morning", {
        kind: "weekly",
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      }),
      routine("walk", "Afternoon walk", "afternoon", {
        kind: "weekly",
        days: ["Wed"],
      }),
      routine("reading", "Read a chapter", "evening", {
        kind: "weekly",
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      }),
      routine("stretch", "Evening stretch", "night", {
        kind: "frequency",
        value: 1,
        unit: "days",
      }),
    ],
  },
};
