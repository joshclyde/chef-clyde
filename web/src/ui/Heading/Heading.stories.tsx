import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading } from "./Heading";

const meta = {
  title: "UI/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: {
    children: "Section heading",
    level: 1,
  },
  argTypes: {
    level: { control: "inline-radio", options: [1, 2, 3] },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = { args: { level: 1 } };

export const Level2: Story = { args: { level: 2 } };

export const Level3: Story = { args: { level: 3 } };

/** All three levels stacked (h1/h2/h3). */
export const AllLevels: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <Heading level={1}>Heading level 1</Heading>
      <Heading level={2}>Heading level 2</Heading>
      <Heading level={3}>Heading level 3</Heading>
    </div>
  ),
};
