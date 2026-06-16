import { type ElementType, type HTMLAttributes } from "react";

import { cn } from "../cn";
import styles from "./Text.module.css";

type TextVariant = "default" | "muted" | "subtle" | "danger" | "strong";
type TextSize = "xs" | "sm" | "md" | "lg";

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  variant?: TextVariant;
  size?: TextSize;
};

export function Text({
  as: Tag = "p",
  variant = "default",
  size = "md",
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(styles.text, styles[variant], styles[size], className)}
      {...props}
    />
  );
}
