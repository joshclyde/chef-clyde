import { useState } from "react";
import { type Message, type ChatMode } from "./types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<ChatMode>("new-recipe");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setSavedRecipeId(null);
    setSaveError(null);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, mode }),
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
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
      })
      .finally(() => setLoading(false));
  };

  const saveRecipe = () => {
    if (saving || messages.length === 0) return;
    setSaving(true);
    setSaveError(null);

    fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((d) => Promise.reject(d.error ?? "Save failed"));
        return res.json();
      })
      .then((data: { recipe: { id: string } }) => {
        setSavedRecipeId(data.recipe.id);
      })
      .catch((err: unknown) => {
        setSaveError(typeof err === "string" ? err : "Failed to save recipe.");
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
    mode,
    setMode,
    input,
    setInput,
    loading,
    saving,
    savedRecipeId,
    saveError,
    submit,
    saveRecipe,
    handleKeyDown,
  };
}
