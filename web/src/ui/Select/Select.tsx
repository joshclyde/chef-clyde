import { type Ref, type SelectHTMLAttributes } from "react";
import { cn } from "../cn";
import styles from "./Select.module.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
};

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn(styles.select, className)} {...props}>
      {children}
    </select>
  );
}
