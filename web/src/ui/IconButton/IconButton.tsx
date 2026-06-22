import { type ButtonHTMLAttributes, type Ref } from "react";

import { cn } from "../cn";
import styles from "./IconButton.module.css";

type IconButtonVariant = "default" | "primary" | "ghost";
type IconButtonSize = "sm" | "md";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required: the button shows only an icon, so it needs an accessible name. */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  ref?: Ref<HTMLButtonElement>;
};

/**
 * A circular, icon-only button. Pass a single icon (e.g. a lucide component) as
 * children. Set `aria-pressed` for toggle buttons — pressed renders the active
 * (filled) treatment regardless of variant.
 */
export function IconButton({
  variant = "default",
  size = "md",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        styles.iconButton,
        styles[variant],
        styles[size],
        className,
      )}
      {...props}
    />
  );
}
