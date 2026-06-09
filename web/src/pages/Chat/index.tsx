import { useChat } from "./useChat";
import { ChatMessages } from "./ChatMessages";
import { SaveRecipeRow } from "./SaveRecipeRow";
import { ChatInput } from "./ChatInput";
import { Stack } from "../../ui";

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
    <Stack gap="xl">
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
    </Stack>
  );
}
