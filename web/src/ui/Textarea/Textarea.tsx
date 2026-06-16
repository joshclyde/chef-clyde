import { type Ref, type TextareaHTMLAttributes } from "react";

import { cn } from "../cn";
import styles from "./Textarea.module.css";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(styles.textarea, className)} {...props} />;
}
