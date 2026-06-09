import { useRef, useEffect } from "react";
import { type Message } from "./types";
import { cn } from "../../ui/cn";
import styles from "./Chat.module.css";

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
          <div className={styles.bubble}>{msg.content}</div>
        </div>
      ))}
      {loading && (
        <div className={cn(styles.message, styles.assistant)}>
          <div className={cn(styles.bubble, styles.loading)}>Thinking...</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
