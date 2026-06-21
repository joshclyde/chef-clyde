import type { Meta, StoryObj } from "@storybook/react-vite";

import { Text } from "./Text";

const VARIANTS = ["default", "muted", "subtle", "danger", "strong"] as const;
const SIZES = ["xs", "sm", "md", "lg"] as const;

const meta = {
  title: "UI/Text",
  component: Text,
  tags: ["autodocs"],
  args: {
    children: "The quick brown fox jumps over the lazy dog.",
    variant: "default",
    size: "md",
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
    as: { control: false },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Muted: Story = { args: { variant: "muted" } };

export const Subtle: Story = { args: { variant: "subtle" } };

export const Danger: Story = { args: { variant: "danger" } };

export const Strong: Story = { args: { variant: "strong" } };

/** Every variant rendered together. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {variant} — the quick brown fox
        </Text>
      ))}
    </div>
  ),
};

/** Every size rendered together. */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {SIZES.map((size) => (
        <Text key={size} size={size}>
          {size} — the quick brown fox
        </Text>
      ))}
    </div>
  ),
};
