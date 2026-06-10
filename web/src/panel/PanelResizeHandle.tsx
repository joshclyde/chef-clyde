import { usePanel } from "./usePanel";
import {
  PANEL_MIN_WIDTH,
  PANEL_MIN_HEIGHT,
} from "./PanelContext";
import { cn } from "../ui/cn";
import styles from "./Panel.module.css";

const KEYBOARD_STEP = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function maxWidth(): number {
  return Math.max(PANEL_MIN_WIDTH, window.innerWidth * 0.8);
}

function maxHeight(): number {
  return Math.max(PANEL_MIN_HEIGHT, window.innerHeight * 0.8);
}

/**
 * Drag (or arrow-key) handle on the panel's inner edge to resize it — the left
 * edge when docked right, the top edge when docked bottom.
 */
export function PanelResizeHandle() {
  const { position, width, height, setWidth, setHeight } = usePanel();
  const isRight = position === "right";

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = isRight ? "col-resize" : "row-resize";

    const onMove = (ev: PointerEvent) => {
      if (isRight) {
        setWidth(
          clamp(startWidth + (startX - ev.clientX), PANEL_MIN_WIDTH, maxWidth()),
        );
      } else {
        setHeight(
          clamp(
            startHeight + (startY - ev.clientY),
            PANEL_MIN_HEIGHT,
            maxHeight(),
          ),
        );
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Functional updaters so repeated/held key presses accumulate correctly.
    if (isRight) {
      // Larger panel grows leftward, so ArrowLeft increases width.
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setWidth((w) => clamp(w + KEYBOARD_STEP, PANEL_MIN_WIDTH, maxWidth()));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setWidth((w) => clamp(w - KEYBOARD_STEP, PANEL_MIN_WIDTH, maxWidth()));
      }
    } else {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHeight((h) => clamp(h + KEYBOARD_STEP, PANEL_MIN_HEIGHT, maxHeight()));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHeight((h) => clamp(h - KEYBOARD_STEP, PANEL_MIN_HEIGHT, maxHeight()));
      }
    }
  };

  return (
    <div
      className={cn(
        styles.resizeHandle,
        isRight ? styles.handleRight : styles.handleBottom,
      )}
      role="separator"
      aria-orientation={isRight ? "vertical" : "horizontal"}
      aria-label="Resize panel"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
