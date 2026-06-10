import { useState } from "react";
import { type Message } from "../Chat/types";

export function useScheduleChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ overwrote: boolean } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** The most recent assistant message — the schedule to save. */
  const latestSchedule =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? null;

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
    setSaved(null);
    setSaveError(null);

    fetch("/api/schedules/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    })
      .then((res) => res.json())
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

  const saveSchedule = (date: string) => {
    if (saving || !latestSchedule) return;
    setSaving(true);
    setSaved(null);
    setSaveError(null);

    fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, content: latestSchedule }),
    })
      .then((res) => {
        if (!res.ok)
          return res
            .json()
            .then((d) => Promise.reject(d.error ?? "Save failed"));
        // 200 = updated an existing date, 201 = newly created.
        const overwrote = res.status === 200;
        return res.json().then(() => setSaved({ overwrote }));
      })
      .catch((err: unknown) => {
        setSaveError(typeof err === "string" ? err : "Failed to save schedule.");
      })
      .finally(() => setSaving(false));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return {
    messages,
    input,
    setInput,
    loading,
    saving,
    saved,
    saveError,
    latestSchedule,
    submit,
    saveSchedule,
    handleKeyDown,
  };
}
