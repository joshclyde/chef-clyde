import { type ChatMode, MODE_CONFIG } from "./types";
import { Button, Inline, Text, Textarea } from "../../ui";
import { cn } from "../../ui/cn";
import styles from "./Chat.module.css";

type Props = {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  loading: boolean;
  hasMessages: boolean;
};

export function ChatInput({
  mode,
  onModeChange,
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  loading,
  hasMessages,
}: Props) {
  const config = MODE_CONFIG[mode];

  return (
    <div className={cn(styles.inputArea, !hasMessages && styles.centered)}>
      {!hasMessages && (
        <>
          <Inline gap="sm" className={styles.modeToggle}>
            {(Object.keys(MODE_CONFIG) as ChatMode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? "primary" : "secondary"}
                className={styles.modeButton}
                onClick={() => onModeChange(m)}
              >
                {MODE_CONFIG[m].label}
              </Button>
            ))}
          </Inline>
          <Text size="lg" variant="muted" className={styles.hint}>
            {config.hint}
          </Text>
        </>
      )}
      <Inline gap="sm" align="end" className={styles.inputRow}>
        <Textarea
          className={styles.inputField}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            hasMessages ? "Continue the conversation..." : config.placeholder
          }
          disabled={loading}
          rows={3}
        />
        <Button onClick={onSubmit} disabled={loading || !input.trim()}>
          Send
        </Button>
      </Inline>
    </div>
  );
}
