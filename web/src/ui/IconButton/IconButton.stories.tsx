import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu, Pencil } from "lucide-react";

import { IconButton } from "./IconButton";

const VARIANTS = ["default", "primary", "ghost"] as const;

const meta = {
  title: "UI/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: {
    "aria-label": "Open menu",
    variant: "default",
    size: "md",
    disabled: false,
    children: <Menu size={22} strokeWidth={2} aria-hidden />,
  },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    size: { control: "inline-radio", options: ["sm", "md"] },
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = { args: { variant: "primary" } };

export const Ghost: Story = { args: { variant: "ghost" } };

/** Toggle buttons render the filled "on" treatment via `aria-pressed`. */
export const Pressed: Story = {
  args: {
    "aria-label": "Toggle edit mode",
    "aria-pressed": true,
    children: <Pencil size={20} strokeWidth={2} aria-hidden />,
  },
};

export const Disabled: Story = { args: { disabled: true } };

/** Every variant at both sizes, side by side. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {(["md", "sm"] as const).map((size) => (
        <div
          key={size}
          style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}
        >
          {VARIANTS.map((variant) => (
            <IconButton
              key={variant}
              aria-label={variant}
              variant={variant}
              size={size}
            >
              <Menu
                size={size === "md" ? 22 : 18}
                strokeWidth={2}
                aria-hidden
              />
            </IconButton>
          ))}
        </div>
      ))}
    </div>
  ),
};
