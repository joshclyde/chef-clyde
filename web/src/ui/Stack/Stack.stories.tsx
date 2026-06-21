import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Stack } from "./Stack";

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

/** A visible placeholder block so spacing/alignment is observable. */
function Box({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        padding: "0.5rem 0.75rem",
        borderRadius: 6,
        background: "var(--color-action-primary-bg, #1f6e54)",
        color: "var(--color-action-primary-text, #fff)",
        textAlign: "center",
        minWidth: 48,
      }}
    >
      {children}
    </div>
  );
}

const meta = {
  title: "UI/Stack",
  component: Stack,
  tags: ["autodocs"],
  args: {
    direction: "column",
    gap: "md",
    wrap: false,
  },
  argTypes: {
    direction: { control: "inline-radio", options: ["row", "column"] },
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
    <Stack
      {...args}
      style={{ border: "1px dashed var(--color-border, #ccc)", padding: 12 }}
    >
      <Box>One</Box>
      <Box>Two</Box>
      <Box>Three</Box>
    </Stack>
  ),
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Column: Story = { args: { direction: "column" } };

export const Row: Story = { args: { direction: "row" } };

/** The full gap scale, top to bottom. */
export const GapScale: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {GAPS.map((gap) => (
        <div key={gap}>
          <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>
            gap=&quot;{gap}&quot;
          </div>
          <Stack direction="row" gap={gap}>
            <Box />
            <Box />
            <Box />
          </Stack>
        </div>
      ))}
    </div>
  ),
};
