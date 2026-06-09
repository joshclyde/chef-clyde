import { type HTMLAttributes, type Ref } from "react";
import { cn } from "../cn";
import styles from "./Card.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>;
};

export function Card({ className, ...props }: CardProps) {
  return <div className={cn(styles.card, className)} {...props} />;
}
