import { useEffect, useRef, useState } from "react";

import { Button, Inline, Input, Select, Stack, Text } from "../../ui";
import {
  DAYS_OF_WEEK,
  FREQUENCY_UNITS,
  OCCURRENCE_KINDS,
  TIMES_OF_DAY,
} from "./constants";
import styles from "./Routines.module.css";
import type {
  DayOfWeek,
  FrequencyUnit,
  Routine,
  RoutineInput,
  RoutineOccurrence,
  RoutineOccurrenceKind,
  TimeOfDay,
} from "./useRoutines";

type RoutineEditorProps = {
  initial?: Routine;
  submitting?: boolean;
  onSubmit: (values: RoutineInput) => void;
  onCancel: () => void;
};

/**
 * Inline form for creating/editing a single routine. The occurrence-kind picker
 * reveals only the inputs that kind needs (days / value+unit). Time of day is a
 * first-class field on every routine, so it always shows.
 */
export function RoutineEditor({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: RoutineEditorProps) {
  const occ = initial?.occurrence;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(
    initial?.timeOfDay ?? "morning",
  );
  const [typicalTime, setTypicalTime] = useState(
    initial?.typicalTimeMinutes != null
      ? String(initial.typicalTimeMinutes)
      : "",
  );
  const [kind, setKind] = useState<RoutineOccurrenceKind>(
    occ?.kind ?? "weekly",
  );

  // Weekly fields
  const [days, setDays] = useState<DayOfWeek[]>(
    occ?.kind === "weekly" ? occ.days : [],
  );

  // Frequency fields
  const [freqValue, setFreqValue] = useState(
    occ?.kind === "frequency" ? String(occ.value) : "1",
  );
  const [freqUnit, setFreqUnit] = useState<FrequencyUnit>(
    occ?.kind === "frequency" ? occ.unit : "days",
  );

  const labelRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    labelRef.current?.focus();
  }, []);

  function toggleDay(day: DayOfWeek) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  const timeNum = Number(typicalTime);
  const freqNum = Number(freqValue);
  const occurrenceValid =
    (kind === "weekly" && days.length > 0) ||
    (kind === "frequency" && Number.isFinite(freqNum) && freqNum > 0);
  const valid =
    label.trim() !== "" &&
    (typicalTime.trim() === "" || (Number.isFinite(timeNum) && timeNum >= 0)) &&
    occurrenceValid;

  function buildOccurrence(): RoutineOccurrence {
    if (kind === "weekly") return { kind: "weekly", days };
    return { kind: "frequency", value: freqNum, unit: freqUnit };
  }

  function save() {
    if (!valid || submitting) return;
    onSubmit({
      label: label.trim(),
      timeOfDay,
      ...(typicalTime.trim() === "" ? {} : { typicalTimeMinutes: timeNum }),
      occurrence: buildOccurrence(),
    });
  }

  return (
    <Stack gap="sm" className={styles.routineEditor}>
      <Stack gap="3xs">
        <Text as="label" size="xs" variant="muted">
          What is the routine?
        </Text>
        <Input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Brush teeth, Make coffee"
        />
      </Stack>

      <Inline gap="md" wrap align="end">
        <Stack gap="3xs" className={styles.field}>
          <Text as="label" size="xs" variant="muted">
            Time of day
          </Text>
          <Select
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
            aria-label="Time of day"
          >
            {TIMES_OF_DAY.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Stack>

        <Stack gap="3xs" className={styles.field}>
          <Text as="label" size="xs" variant="muted">
            When
          </Text>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as RoutineOccurrenceKind)}
            aria-label="Occurrence type"
          >
            {OCCURRENCE_KINDS.map(({ kind: k, label: l }) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Stack>

        <Stack gap="3xs" className={styles.field}>
          <Text as="label" size="xs" variant="muted">
            Duration (min, optional)
          </Text>
          <Input
            className={styles.numInput}
            type="number"
            min={0}
            value={typicalTime}
            onChange={(e) => setTypicalTime(e.target.value)}
            placeholder="—"
            aria-label="Typical duration in minutes"
          />
        </Stack>
      </Inline>

      {kind === "weekly" && (
        <Stack gap="2xs">
          <Text as="label" size="xs" variant="muted">
            Days
          </Text>
          <Inline gap="2xs" wrap>
            {DAYS_OF_WEEK.map((day) => (
              <Button
                key={day}
                size="sm"
                variant={days.includes(day) ? "primary" : "secondary"}
                onClick={() => toggleDay(day)}
                aria-pressed={days.includes(day)}
              >
                {day}
              </Button>
            ))}
          </Inline>
        </Stack>
      )}

      {kind === "frequency" && (
        <Stack gap="3xs" className={styles.field}>
          <Text as="label" size="xs" variant="muted">
            Every
          </Text>
          <Inline gap="2xs">
            <Input
              className={styles.numInput}
              type="number"
              min={1}
              value={freqValue}
              onChange={(e) => setFreqValue(e.target.value)}
              aria-label="Frequency value"
            />
            <Select
              value={freqUnit}
              onChange={(e) => setFreqUnit(e.target.value as FrequencyUnit)}
              aria-label="Frequency unit"
            >
              {FREQUENCY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Inline>
        </Stack>
      )}

      <Inline gap="2xs">
        <Button size="sm" onClick={save} disabled={!valid || submitting}>
          {submitting ? "Saving..." : initial ? "Save routine" : "Add routine"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
