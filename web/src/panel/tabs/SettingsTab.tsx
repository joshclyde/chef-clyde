import { Button, Heading, Inline, Stack, Text } from "../../ui";
import { type PanelPosition } from "../PanelContext";
import { usePanel } from "../usePanel";

const POSITIONS: { id: PanelPosition; label: string }[] = [
  { id: "right", label: "Right" },
  { id: "bottom", label: "Bottom" },
];

/** A second tab, demonstrating that the Panel hosts more than just chat. */
export function SettingsTab() {
  const { position, setPosition } = usePanel();

  return (
    <Stack gap="lg" style={{ padding: "var(--space-lg)" }}>
      <Stack gap="2xs">
        <Heading level={3}>Panel position</Heading>
        <Text variant="muted" size="sm">
          Dock the panel to the side or the bottom of the workspace.
        </Text>
      </Stack>
      <Inline gap="sm">
        {POSITIONS.map((p) => (
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
    </Stack>
  );
}
