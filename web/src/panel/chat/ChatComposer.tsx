import { Sparkles } from "lucide-react";

import { TextareaWithSubmit } from "../../ui";
import styles from "./Chat.module.css";

type Props = {
  input: string;
  placeholder: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({
  input,
  placeholder,
  loading,
  onInputChange,
  onSubmit,
}: Props) {
  return (
    <TextareaWithSubmit
      className={styles.inputField}
      value={input}
      onChange={(e) => onInputChange(e.target.value)}
      placeholder={placeholder}
      disabled={loading}
      rows={2}
      onSubmit={onSubmit}
      submitVariant="ai"
      submitIcon={<Sparkles size={16} strokeWidth={2} aria-hidden />}
      submitLabel="Send"
    />
  );
}
