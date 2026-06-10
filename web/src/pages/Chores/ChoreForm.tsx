import { useState } from "react";
import { Button, Inline, Input, Select, Stack, Text } from "../../ui";
import { FLOORS, FREQUENCY_UNITS, ROOMS } from "./constants";
import type { Chore, ChoreInput, FrequencyUnit } from "./useChores";
import styles from "./Tasks.module.css";

type ChoreFormProps = {
  initial?: Chore;
  submitting?: boolean;
  onSubmit: (values: ChoreInput) => void;
  onCancel: () => void;
};

export function ChoreForm({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: ChoreFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [frequencyValue, setFrequencyValue] = useState(
    initial ? String(initial.frequencyValue) : "1",
  );
  const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit>(
    initial?.frequencyUnit ?? "weeks",
  );
  const [typicalTime, setTypicalTime] = useState(
    initial?.typicalTimeMinutes != null ? String(initial.typicalTimeMinutes) : "",
  );
  const [room, setRoom] = useState(initial?.room ?? "");
  const [floor, setFloor] = useState(initial?.floor ?? "");

  const freqNum = Number(frequencyValue);
  const timeNum = Number(typicalTime);
  const valid =
    name.trim() !== "" &&
    Number.isFinite(freqNum) &&
    freqNum > 0 &&
    (typicalTime.trim() === "" || (Number.isFinite(timeNum) && timeNum >= 0));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      frequencyValue: freqNum,
      frequencyUnit,
      typicalTimeMinutes: typicalTime.trim() === "" ? undefined : timeNum,
      room: room || undefined,
      floor: floor || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        <Stack gap="3xs">
          <Text as="label" size="xs" variant="muted">
            Name
          </Text>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Clean the shower"
            autoFocus
          />
        </Stack>

        <Stack gap="3xs">
          <Text as="label" size="xs" variant="muted">
            Frequency
          </Text>
          <Inline gap="sm">
            <Text size="sm" variant="muted">
              every
            </Text>
            <Input
              className={styles.numInput}
              type="number"
              min={1}
              value={frequencyValue}
              onChange={(e) => setFrequencyValue(e.target.value)}
            />
            <Select
              className={styles.unitSelect}
              value={frequencyUnit}
              onChange={(e) => setFrequencyUnit(e.target.value as FrequencyUnit)}
            >
              {FREQUENCY_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </Inline>
        </Stack>

        <Stack gap="3xs">
          <Text as="label" size="xs" variant="muted">
            Typical time (optional)
          </Text>
          <Inline gap="sm">
            <Input
              className={styles.numInput}
              type="number"
              min={0}
              value={typicalTime}
              onChange={(e) => setTypicalTime(e.target.value)}
              placeholder="—"
            />
            <Text size="sm" variant="muted">
              minutes
            </Text>
          </Inline>
        </Stack>

        <Stack gap="3xs">
          <Text as="label" size="xs" variant="muted">
            Room (optional)
          </Text>
          <Select
            className={styles.selectField}
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">—</option>
            {ROOMS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Stack>

        <Stack gap="3xs">
          <Text as="label" size="xs" variant="muted">
            Floor (optional)
          </Text>
          <Select
            className={styles.selectField}
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
          >
            <option value="">—</option>
            {FLOORS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Stack>

        <Inline gap="sm">
          <Button type="submit" disabled={!valid || submitting}>
            {submitting ? "Saving..." : initial ? "Save changes" : "Add chore"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        </Inline>
      </Stack>
    </form>
  );
}
