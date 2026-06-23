import {
  AI_EFFORT_OPTIONS,
  AI_MODEL_OPTIONS,
  type AiEffort,
  type AiModel,
  modelSupportsEffort,
} from "../../ai/AiSettingsContext";
import { useAiSettings } from "../../ai/useAiSettings";
import { Select, Text } from "../../ui";
import styles from "./Chat.module.css";

/**
 * Model + effort pickers and a token-usage readout for the chat panel — the
 * Claude-app-style controls below the composer. Reads/writes the app-global
 * AI settings, so the choice applies to every AI call, not just this chat.
 */
export function AiControls() {
  const { model, effort, setModel, setEffort, lastUsage } = useAiSettings();
  const effortEnabled = modelSupportsEffort(model);

  return (
    <div className={styles.aiControls}>
      <div className={styles.aiControlsRow}>
        <Select
          aria-label="Model"
          className={styles.aiControlSelect}
          value={model}
          onChange={(e) => setModel(e.target.value as AiModel)}
        >
          {AI_MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Effort level"
          className={styles.aiControlSelect}
          value={effort}
          disabled={!effortEnabled}
          title={
            effortEnabled
              ? undefined
              : "This model doesn't support effort levels"
          }
          onChange={(e) => setEffort(e.target.value as AiEffort)}
        >
          {AI_EFFORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label} effort
            </option>
          ))}
        </Select>
      </div>
      {lastUsage && (
        <Text variant="muted" size="sm" className={styles.aiUsage}>
          {lastUsage.input_tokens.toLocaleString()} in ·{" "}
          {lastUsage.output_tokens.toLocaleString()} out tokens
        </Text>
      )}
    </div>
  );
}
