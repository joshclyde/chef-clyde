import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";

const VARIANTS = [
  "primary",
  "secondary",
  "danger",
  "success",
  "ghost",
  "ai",
] as const;

const meta = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Button",
    variant: "primary",
    size: "md",
    disabled: false,
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "inline-radio", options: ["sm", "md"] },
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Danger: Story = { args: { variant: "danger" } };

export const Success: Story = { args: { variant: "success" } };

export const Ghost: Story = { args: { variant: "ghost" } };

export const Ai: Story = { args: { variant: "ai", children: "Ask AI" } };

export const Disabled: Story = { args: { disabled: true } };

/** Every variant at both sizes, side by side. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {(["md", "sm"] as const).map((size) => (
        <div
          key={size}
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
        >
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
};
