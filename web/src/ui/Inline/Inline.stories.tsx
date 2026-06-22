import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Text } from "../Text/Text";
import { Inline } from "./Inline";

const GAPS = [
  "none",
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const;

const meta = {
  title: "UI/Inline",
  component: Inline,
  tags: ["autodocs"],
  args: {
    gap: "sm",
    align: "center",
    wrap: false,
  },
  argTypes: {
    gap: { control: "select", options: GAPS },
    align: {
      control: "select",
      options: [undefined, "start", "center", "end", "stretch"],
    },
    justify: {
      control: "select",
      options: [undefined, "start", "center", "end", "between"],
    },
    wrap: { control: "boolean" },
  },
  render: (args) => (
    <Inline {...args}>
      <Text>Status</Text>
      <Badge>Active</Badge>
      <Button size="sm">Action</Button>
    </Inline>
  ),
} satisfies Meta<typeof Inline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Pushes items to opposite ends — common toolbar pattern. */
export const SpaceBetween: Story = {
  args: { justify: "between" },
  render: (args) => (
    <Inline {...args} style={{ width: 320 }}>
      <Text variant="strong">Dinner</Text>
      <Button size="sm">Edit</Button>
    </Inline>
  ),
};
