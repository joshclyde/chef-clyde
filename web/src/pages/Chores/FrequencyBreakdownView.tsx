import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Card, Heading, Inline, Stack, Text } from "../../ui";
import {
  formatMinutes,
  type FrequencyGroup,
  frequencyGroups,
} from "./choreStats";
import styles from "./Dashboard.module.css";
import type { Chore } from "./useChores";

function GroupRow({ group }: { group: FrequencyGroup }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.groupToggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <Icon size={16} aria-hidden className={styles.groupChevron} />
        <Text as="span" size="sm">
          {group.label}{" "}
          <Text as="span" size="xs" variant="subtle">
            ({group.chores.length})
          </Text>
        </Text>
        <Text
          as="span"
          size="sm"
          variant="strong"
          className={styles.groupTotal}
        >
          {group.timedCount === 0
            ? "—"
            : `${formatMinutes(group.minutesPerWeek)}/wk`}
        </Text>
      </button>

      {expanded && (
        <ul className={styles.groupChores}>
          {group.chores.map(({ chore, minutesPerWeek }) => (
            <li key={chore.id}>
              <Inline justify="between" gap="md">
                <Text size="sm">{chore.name}</Text>
                {minutesPerWeek == null ? (
                  <Text size="sm" variant="subtle">
                    —
                  </Text>
                ) : (
                  <Text size="sm" variant="muted">
                    {formatMinutes(chore.typicalTimeMinutes ?? 0)} ·{" "}
                    {formatMinutes(minutesPerWeek)}/wk
                  </Text>
                )}
              </Inline>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FrequencyBreakdownView({ chores }: { chores: Chore[] }) {
  const groups = frequencyGroups(chores);

  return (
    <Stack gap="md">
      <Heading level={2}>Time by frequency</Heading>
      <Card>
        <div>
          {groups.map((group) => (
            <GroupRow key={group.label} group={group} />
          ))}
        </div>
      </Card>
    </Stack>
  );
}
