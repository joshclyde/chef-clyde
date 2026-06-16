import { Sparkles } from "lucide-react";
import { useEffect,useRef } from "react";

import { cn } from "../../ui/cn";
import styles from "./Chat.module.css";
import { type Message } from "./types";

/** Small iridescent sparkle that marks a message as coming from the AI. */
function AiMark() {
  return (
    <span className={styles.aiMark} aria-hidden>
      <Sparkles size={14} strokeWidth={2} />
    </span>
  );
}

type Props = {
  messages: Message[];
  loading: boolean;
};

export function ChatMessages({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className={styles.messages}>
      {messages.map((msg, i) => (
        <div key={i} className={cn(styles.message, styles[msg.role])}>
          {msg.role === "assistant" && <AiMark />}
          <div className={styles.bubble}>{msg.content}</div>
        </div>
      ))}
      {loading && (
        <div className={cn(styles.message, styles.assistant)}>
          <AiMark />
          <div className={cn(styles.bubble, styles.loading)}>Thinking…</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
