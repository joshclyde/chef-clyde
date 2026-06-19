import {
  AI_EFFORT_OPTIONS,
  AI_MODEL_OPTIONS,
  type AiEffort,
  type AiModel,
  modelSupportsEffort,
} from "../../ai/AiSettingsContext";
import { useAiMotion } from "../../ai/useAiMotion";
import { useAiSettings } from "../../ai/useAiSettings";
import { type PanelPosition } from "../../panel/PanelContext";
import { usePanel } from "../../panel/usePanel";
import { useTheme } from "../../theme/useTheme";
import { Button, Heading, Inline, Select, Stack, Text } from "../../ui";
import styles from "./Settings.module.css";

const THEMES = [
  { id: "light" as const, label: "Light" },
  { id: "dark" as const, label: "Dark" },
];

const MOTION_OPTIONS = [
  { id: "on" as const, label: "On" },
  { id: "off" as const, label: "Off" },
];

const PANEL_VISIBILITY = [
  { id: true, label: "Show" },
  { id: false, label: "Hide" },
];

const PANEL_POSITIONS: { id: PanelPosition; label: string }[] = [
  { id: "right", label: "Right" },
  { id: "bottom", label: "Bottom" },
];

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowInfo}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowDescription}>{description}</span>
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="sm">
      <Heading level={2} className={styles.sectionHeading}>
        {title}
      </Heading>
      <div className={styles.sectionBox}>{children}</div>
    </Stack>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { motion, setMotion } = useAiMotion();
  const { model, effort, setModel, setEffort } = useAiSettings();
  const { open, setOpen, position, setPosition } = usePanel();
  const effortEnabled = modelSupportsEffort(model);

  return (
    <Stack gap="2xl" className={styles.page}>
      <Heading level={1}>Settings</Heading>

      <SettingSection title="Appearance">
        <SettingRow
          label="Theme"
          description="Switch between light and dark mode."
        >
          <Inline gap="sm">
            {THEMES.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={theme === t.id ? "primary" : "secondary"}
                onClick={() => setTheme(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </Inline>
        </SettingRow>
      </SettingSection>

      <SettingSection title="AI">
        <SettingRow
          label="Motion"
          description="Animate AI surfaces with an iridescent gradient."
        >
          <Inline gap="sm">
            {MOTION_OPTIONS.map((m) => (
              <Button
                key={m.id}
                size="sm"
                variant={motion === m.id ? "primary" : "secondary"}
                onClick={() => setMotion(m.id)}
              >
                {m.label}
              </Button>
            ))}
          </Inline>
        </SettingRow>
        <SettingRow
          label="Model"
          description="The Claude model used for AI features."
        >
          <Select
            aria-label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value as AiModel)}
          >
            {AI_MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </SettingRow>
        <SettingRow
          label="Effort"
          description="How hard the model thinks. Not available for all models."
        >
          <Select
            aria-label="Effort level"
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
                {opt.label}
              </option>
            ))}
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="Panel">
        <SettingRow
          label="Visibility"
          description="Show or hide the chat panel."
        >
          <Inline gap="sm">
            {PANEL_VISIBILITY.map((v) => (
              <Button
                key={String(v.id)}
                size="sm"
                variant={open === v.id ? "primary" : "secondary"}
                onClick={() => setOpen(v.id)}
              >
                {v.label}
              </Button>
            ))}
          </Inline>
        </SettingRow>
        <SettingRow
          label="Position"
          description="Dock the panel to the side or the bottom of the workspace."
        >
          <Inline gap="sm">
            {PANEL_POSITIONS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={position === p.id ? "primary" : "secondary"}
                onClick={() => setPosition(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </Inline>
        </SettingRow>
      </SettingSection>
    </Stack>
  );
}
