import { Button, Inline, Text } from "../../ui";
import { cn } from "../../ui/cn";
import { type ChatConfig } from "./chatConfigs";
import { usePanelChat } from "./usePanelChat";
import { ChatMessages } from "./ChatMessages";
import { ChatComposer } from "./ChatComposer";
import styles from "./Chat.module.css";

/**
 * The full chat experience for one activity, driven entirely by `config`.
 * Mount with a `key` per activity so switching activities starts a fresh thread.
 */
export function ChatView({ config }: { config: ChatConfig }) {
  const { messages, mode, setMode, input, setInput, loading, submit } =
    usePanelChat(config);

  const hasMessages = messages.length > 0;
  const SaveAction = config.SaveAction;
  const selectedMode = config.modes?.find((m) => m.id === mode);
  const placeholder = hasMessages
    ? config.continuePlaceholder
    : selectedMode?.placeholder ?? config.placeholder;

  return (
    <div className={styles.chatView}>
      <div className={styles.body}>
        {hasMessages ? (
          <>
            <ChatMessages messages={messages} loading={loading} />
            {!loading && SaveAction && <SaveAction messages={messages} />}
          </>
        ) : (
          <div className={styles.intro}>
            {config.modes && (
              <Inline gap="sm" wrap className={styles.modeToggle}>
                {config.modes.map((m) => (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={mode === m.id ? "ai" : "secondary"}
                    className={styles.modeButton}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </Button>
                ))}
              </Inline>
            )}
            <Text variant="muted" className={cn(styles.hint)}>
              {selectedMode?.hint ?? config.emptyHint}
            </Text>
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <ChatComposer
          input={input}
          placeholder={placeholder}
          loading={loading}
          onInputChange={setInput}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
