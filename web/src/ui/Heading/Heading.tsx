import { type HTMLAttributes } from "react";
import { cn } from "../cn";
import styles from "./Heading.module.css";

type HeadingLevel = 1 | 2 | 3;

const TAG_FOR_LEVEL = { 1: "h1", 2: "h2", 3: "h3" } as const;

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  level?: HeadingLevel;
};

export function Heading({ level = 1, className, ...props }: HeadingProps) {
  const Tag = TAG_FOR_LEVEL[level];
  return (
    <Tag className={cn(styles.heading, styles[`h${level}`], className)} {...props} />
  );
}
