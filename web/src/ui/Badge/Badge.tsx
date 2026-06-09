import { type HTMLAttributes } from "react";
import { cn } from "../cn";
import styles from "./Badge.module.css";

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, ...props }: BadgeProps) {
  return <span className={cn(styles.badge, className)} {...props} />;
}
