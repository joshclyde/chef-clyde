import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const MOCK_RESPONSE =
  "Here's a simple pasta recipe!\n\n**Ingredients:**\n- 200g spaghetti\n- 2 cloves garlic\n- 3 tbsp olive oil\n- Salt and pepper\n- Fresh parsley\n\n**Instructions:**\n1. Boil salted water and cook spaghetti al dente.\n2. Sauté minced garlic in olive oil over medium heat for 1 minute.\n3. Toss drained pasta in the garlic oil.\n4. Season with salt, pepper, and chopped parsley.\n\nEnjoy!";

export default function Recipes() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

    setTimeout(() => {
      setMessages([
        ...newMessages,
        { role: "assistant", content: MOCK_RESPONSE },
      ]);
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="recipes-chat">
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
      <div className={`chat-input-area${!hasMessages ? " centered" : ""}`}>
        {!hasMessages && (
          <p className="chat-prompt-hint">Ask me to create a recipe for you!</p>
        )}
        <div className="chat-input-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasMessages
                ? "Continue the conversation..."
                : "e.g. Make me a pasta recipe with mushrooms..."
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
