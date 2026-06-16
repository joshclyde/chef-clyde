import { Send } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";

import { Button } from "../Button/Button";
import { cn } from "../cn";
import { Textarea } from "../Textarea/Textarea";
import styles from "./TextareaWithSubmit.module.css";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onSubmit"> & {
  onSubmit: () => void;
  /** Accessible name for the icon-only submit button. Default "Send". */
  submitLabel?: string;
  /** Icon inside the submit button. Default <Send />. */
  submitIcon?: ReactNode;
  submitVariant?: ComponentProps<typeof Button>["variant"];
  submitSize?: ComponentProps<typeof Button>["size"];
  /** Extra disable condition; the button is also auto-disabled when the value is empty. */
  submitDisabled?: boolean;
  /** Submit on Enter (Shift+Enter inserts a newline). Default true. */
  submitOnEnter?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

/**
 * A textarea with the submit button built into its bottom-right corner — for
 * forms that are a single textarea plus a submit action (e.g. a chat composer).
 */
export function TextareaWithSubmit({
  onSubmit,
  submitLabel = "Send",
  submitIcon = <Send size={16} strokeWidth={2} aria-hidden />,
  submitVariant = "primary",
  submitSize = "sm",
  submitDisabled = false,
  submitOnEnter = true,
  className,
  value,
  disabled,
  onKeyDown,
  ...props
}: Props) {
  const isEmpty = typeof value === "string" && value.trim().length === 0;
  const canSubmit = !disabled && !submitDisabled && !isEmpty;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (
      submitOnEnter &&
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.defaultPrevented
    ) {
      e.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div className={styles.wrapper}>
      <Textarea
        className={cn(styles.field, className)}
        value={value}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        {...props}
      />
      <Button
        type="button"
        variant={submitVariant}
        size={submitSize}
        className={styles.submit}
        onClick={onSubmit}
        disabled={!canSubmit}
        aria-label={submitLabel}
      >
        {submitIcon}
      </Button>
    </div>
  );
}
