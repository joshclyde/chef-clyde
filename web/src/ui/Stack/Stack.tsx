import { type HTMLAttributes, type Ref } from "react";
import { cn } from "../cn";
import styles from "./Stack.module.css";

type Gap =
  | "none"
  | "3xs"
  | "2xs"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl";
type Align = "start" | "center" | "end" | "stretch";
type Justify = "start" | "center" | "end" | "between";

const GAP_TOKEN: Record<Gap, string> = {
  none: "0",
  "3xs": "var(--space-3xs)",
  "2xs": "var(--space-2xs)",
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
};

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  direction?: "row" | "column";
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  ref?: Ref<HTMLDivElement>;
};

export function Stack({
  direction = "column",
  gap = "md",
  align,
  justify,
  wrap = false,
  className,
  style,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        styles.stack,
        styles[direction],
        align && styles[`align-${align}`],
        justify && styles[`justify-${justify}`],
        wrap && styles.wrap,
        className,
      )}
      style={{ gap: GAP_TOKEN[gap], ...style }}
      {...props}
    />
  );
}
