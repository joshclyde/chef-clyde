import { useChat } from "./useChat";
import { ChatMessages } from "./ChatMessages";
import { SaveRecipeRow } from "./SaveRecipeRow";
import { ChatInput } from "./ChatInput";

export default function Chat() {
  const {
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
  } = useChat();

  const hasMessages = messages.length > 0;

  return (
    <div className="chat">
      {hasMessages && <ChatMessages messages={messages} loading={loading} />}
      {hasMessages && !loading && (
        <SaveRecipeRow
          saving={saving}
          savedRecipeId={savedRecipeId}
          saveError={saveError}
          onSave={saveRecipe}
        />
      )}
      <ChatInput
        mode={mode}
        onModeChange={setMode}
        input={input}
        onInputChange={setInput}
        onKeyDown={handleKeyDown}
        onSubmit={submit}
        loading={loading}
        hasMessages={hasMessages}
      />
    </div>
  );
}
