import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { TextareaWithSubmit } from "./TextareaWithSubmit";

/**
 * Controlled wrapper so the built-in "disabled while empty" behaviour is live:
 * the submit button enables only once there's non-whitespace text.
 */
function Demo(args: ComponentProps<typeof TextareaWithSubmit>) {
  const [value, setValue] = useState("");
  return (
    <TextareaWithSubmit
      {...args}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

const meta = {
  title: "UI/TextareaWithSubmit",
  component: TextareaWithSubmit,
  tags: ["autodocs"],
  args: {
    onSubmit: fn(),
    placeholder: "Message…",
    submitLabel: "Send",
    submitVariant: "primary",
    submitSize: "sm",
    submitOnEnter: true,
  },
  argTypes: {
    submitVariant: {
      control: "select",
      options: ["primary", "secondary", "danger", "success", "ghost", "ai"],
    },
    submitSize: { control: "inline-radio", options: ["sm", "md"] },
    submitOnEnter: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof TextareaWithSubmit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Interaction test: empty → disabled, type → enabled, click → onSubmit fires. */
export const SubmitFlow: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole("textbox");
    const submit = canvas.getByRole("button", { name: "Send" });

    await expect(submit).toBeDisabled();

    await userEvent.type(textarea, "Hello chef");
    await expect(submit).toBeEnabled();

    await userEvent.click(submit);
    await expect(args.onSubmit).toHaveBeenCalled();
  },
};
