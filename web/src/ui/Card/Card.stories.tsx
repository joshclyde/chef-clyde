import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading } from "../Heading/Heading";
import { Text } from "../Text/Text";
import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Card content",
  },
};

/** A card composing a heading and body text. */
export const WithContent: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <Heading level={3}>Weeknight pasta</Heading>
      <Text variant="muted">
        A quick tomato and garlic pasta that comes together in 20 minutes.
      </Text>
    </Card>
  ),
};
