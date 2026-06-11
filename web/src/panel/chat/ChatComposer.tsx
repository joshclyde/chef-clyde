import { Sparkles } from "lucide-react";
import { Button, Inline, Textarea } from "../../ui";
import styles from "./Chat.module.css";

type Props = {
  input: string;
  placeholder: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
};

export function ChatComposer({
  input,
  placeholder,
  loading,
  onInputChange,
  onKeyDown,
  onSubmit,
}: Props) {
  return (
    <Inline gap="sm" align="end" className={styles.inputRow}>
      <Textarea
        className={styles.inputField}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={loading}
        rows={2}
      />
      <Button
        variant="ai"
        onClick={onSubmit}
        disabled={loading || !input.trim()}
      >
        <Sparkles size={16} strokeWidth={2} aria-hidden />
        Send
      </Button>
    </Inline>
  );
}
