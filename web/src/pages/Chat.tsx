import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatMode = "new-recipe" | "pantry-recipe";

const MODE_CONFIG: Record<
  ChatMode,
  { label: string; hint: string; placeholder: string }
> = {
  "new-recipe": {
    label: "New Recipe Creator",
    hint: "Plan your meals — I'll create recipes you can shop for.",
    placeholder: "e.g. Make me a pasta recipe with mushrooms...",
  },
  "pantry-recipe": {
    label: "Pantry Recipe Creator",
    hint: "I'll build a recipe from what's already in your pantry.",
    placeholder: "e.g. What can I make for dinner tonight?",
  },
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<ChatMode>("new-recipe");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
          {
            role: "assistant",
            content: "Something went wrong. Please try again.",
          },
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

  const hasMessages = messages.length > 0;
  const config = MODE_CONFIG[mode];

  return (
    <div className="chat">
      {hasMessages && (
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-message-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant">
              <div className="chat-message-content chat-loading">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
      {hasMessages && !loading && (
        <div className="chat-save-row">
          <button
            onClick={saveRecipe}
            disabled={saving}
            className="save-recipe-btn"
          >
            {saving ? "Saving..." : savedRecipeId ? "Saved!" : "Save to Recipes"}
          </button>
          {saveError && <span className="save-error">{saveError}</span>}
        </div>
      )}
      <div className={`chat-input-area${!hasMessages ? " centered" : ""}`}>
        {!hasMessages && (
          <>
            <div className="mode-toggle">
              {(Object.keys(MODE_CONFIG) as ChatMode[]).map((m) => (
                <button
                  key={m}
                  className={`mode-toggle-btn${mode === m ? " active" : ""}`}
                  onClick={() => setMode(m)}
                >
                  {MODE_CONFIG[m].label}
                </button>
              ))}
            </div>
            <p className="chat-prompt-hint">{config.hint}</p>
          </>
        )}
        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasMessages ? "Continue the conversation..." : config.placeholder
            }
            disabled={loading}
            rows={3}
          />
          <button onClick={submit} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
