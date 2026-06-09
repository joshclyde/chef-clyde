import { useRef, useEffect } from "react";
import { type Message } from "./types";

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
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i} className={`chat-message ${msg.role}`}>
          <div className="chat-message-content">{msg.content}</div>
        </div>
      ))}
      {loading && (
        <div className="chat-message assistant">
          <div className="chat-message-content chat-loading">Thinking...</div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
