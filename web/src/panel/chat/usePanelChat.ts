import { useState } from "react";

import { type ChatConfig } from "./chatConfigs";
import { type ChatMode, type Message } from "./types";

/**
 * Generic chat state for the Panel. The conversation talks to whatever endpoint
 * the active activity's config points at; per-activity differences (modes, save
 * actions) live in the config, not here.
 */
export function usePanelChat(config: ChatConfig) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<ChatMode>(config.defaultMode);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config.buildBody(newMessages, mode)),
    })
      .then((res) => res.json() as Promise<{ content: string }>)
      .then((data) => {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.content },
        ]);
      })
      .catch(() => {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "Something went wrong. Please try again.",
          },
        ]);
      })
      .finally(() => setLoading(false));
  };

  return {
    messages,
    mode,
    setMode,
    input,
    setInput,
    loading,
    submit,
  };
}
