import { useEffect, useRef, useState } from "react";

import { Button, Inline, Input, Select } from "../../ui";
import { FLOORS, FREQUENCY_UNITS, ROOMS } from "./constants";
import styles from "./Tasks.module.css";
import type { Chore, ChoreInput, FrequencyUnit } from "./useChores";

type ChoreRowEditorProps = {
  initial?: Chore;
  submitting?: boolean;
  onSubmit: (values: ChoreInput) => void;
  onCancel: () => void;
};

/**
 * An inline, editable table row used for both creating a new chore and editing an
 * existing one. Each column is its own field so the user can Tab left-to-right across
 * them; the name field is auto-focused on mount.
 */
export function ChoreRowEditor({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: ChoreRowEditorProps) {
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

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const freqNum = Number(frequencyValue);
  const timeNum = Number(typicalTime);
  const valid =
    name.trim() !== "" &&
    Number.isFinite(freqNum) &&
    freqNum > 0 &&
    (typicalTime.trim() === "" || (Number.isFinite(timeNum) && timeNum >= 0));

  function save() {
    if (!valid || submitting) return;
    onSubmit({
      name: name.trim(),
      frequencyValue: freqNum,
      frequencyUnit,
      typicalTimeMinutes: typicalTime.trim() === "" ? undefined : timeNum,
      room: room || undefined,
      floor: floor || undefined,
    });
  }

  // Tab moves between cells natively; Enter saves and Escape cancels for keyboard users.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <tr className={styles.editRow}>
      <td />
      <td className={styles.editCell}>
        <Input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Clean the shower"
        />
      </td>
      <td className={styles.editCell}>
        <Inline gap="2xs">
          <Input
            className={styles.numInput}
            type="number"
            min={1}
            value={frequencyValue}
            onChange={(e) => setFrequencyValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Frequency value"
          />
          <Select
            className={styles.unitSelect}
            value={frequencyUnit}
            onChange={(e) => setFrequencyUnit(e.target.value as FrequencyUnit)}
            aria-label="Frequency unit"
          >
            {FREQUENCY_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
        </Inline>
      </td>
      <td className={styles.editCell}>
        <Input
          className={styles.numInput}
          type="number"
          min={0}
          value={typicalTime}
          onChange={(e) => setTypicalTime(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="—"
          aria-label="Typical time in minutes"
        />
      </td>
      <td className={styles.editCell}>
        <Select
          className={styles.rowSelect}
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          aria-label="Room"
        >
          <option value="">—</option>
          {ROOMS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </td>
      <td className={styles.editCell}>
        <Select
          className={styles.rowSelect}
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          aria-label="Floor"
        >
          <option value="">—</option>
          {FLOORS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>
      </td>
      <td />
      <td className={styles.actionsCell}>
        <Inline gap="2xs">
          <Button
            size="sm"
            type="button"
            onClick={save}
            disabled={!valid || submitting}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        </Inline>
      </td>
    </tr>
  );
}
