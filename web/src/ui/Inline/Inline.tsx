import { Stack, type StackProps } from "../Stack/Stack";

type InlineProps = Omit<StackProps, "direction">;

/** Horizontal Stack with sensible inline defaults (centered, small gap). */
export function Inline({
  align = "center",
  gap = "sm",
  ...props
}: InlineProps) {
  return <Stack direction="row" align={align} gap={gap} {...props} />;
}
