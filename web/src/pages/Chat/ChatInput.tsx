import { type ChatMode, MODE_CONFIG } from "./types";

type Props = {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  input: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  loading: boolean;
  hasMessages: boolean;
};

export function ChatInput({
  mode,
  onModeChange,
  input,
  onInputChange,
  onKeyDown,
  onSubmit,
  loading,
  hasMessages,
}: Props) {
  const config = MODE_CONFIG[mode];

  return (
    <div className={`chat-input-area${!hasMessages ? " centered" : ""}`}>
      {!hasMessages && (
        <>
          <div className="mode-toggle">
            {(Object.keys(MODE_CONFIG) as ChatMode[]).map((m) => (
              <button
                key={m}
                className={`mode-toggle-btn${mode === m ? " active" : ""}`}
                onClick={() => onModeChange(m)}
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
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={hasMessages ? "Continue the conversation..." : config.placeholder}
          disabled={loading}
          rows={3}
        />
        <button onClick={onSubmit} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
