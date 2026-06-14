import { useEffect, useRef, useState } from "react";
import { Button, Inline, Input, Select, Stack, Text } from "../../ui";
import { DAYS_OF_WEEK, FREQUENCY_UNITS, OCCURRENCE_KINDS, TIMES_OF_DAY } from "./constants";
import type {
  DayOfWeek,
  FrequencyUnit,
  HobbyTask,
  HobbyTaskInput,
  Occurrence,
  OccurrenceKind,
  TimeOfDay,
} from "./useHobbies";
import styles from "./Hobbies.module.css";

type HobbyTaskEditorProps = {
  initial?: HobbyTask;
  submitting?: boolean;
  onSubmit: (values: HobbyTaskInput) => void;
  onCancel: () => void;
};

/**
 * Inline form for creating/editing a single hobby task. The occurrence-kind
 * picker reveals only the inputs that kind needs (date+times / days+time-of-day
 * / value+unit / nothing), so any task — from a booked event to a loose idea —
 * is expressible with one shape.
 */
export function HobbyTaskEditor({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: HobbyTaskEditorProps) {
  const occ = initial?.occurrence;
  const [label, setLabel] = useState(initial?.label ?? "");
  const [typicalTime, setTypicalTime] = useState(
    initial?.typicalTimeMinutes != null ? String(initial.typicalTimeMinutes) : "",
  );
  const [kind, setKind] = useState<OccurrenceKind>(occ?.kind ?? "weekly");

  // Event fields
  const [date, setDate] = useState(occ?.kind === "event" ? occ.date : "");
  const [startTime, setStartTime] = useState(
    occ?.kind === "event" ? (occ.startTime ?? "") : "",
  );
  const [endTime, setEndTime] = useState(
    occ?.kind === "event" ? (occ.endTime ?? "") : "",
  );

  // Weekly fields
  const [days, setDays] = useState<DayOfWeek[]>(
    occ?.kind === "weekly" ? occ.days : [],
  );
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(
    occ?.kind === "weekly" ? (occ.timeOfDay ?? "any") : "any",
  );

  // Frequency fields
  const [freqValue, setFreqValue] = useState(
    occ?.kind === "frequency" ? String(occ.value) : "1",
  );
  const [freqUnit, setFreqUnit] = useState<FrequencyUnit>(
    occ?.kind === "frequency" ? occ.unit : "weeks",
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
  const timesValid =
    startTime === "" || endTime === "" || endTime > startTime;
  const occurrenceValid =
    (kind === "event" && date !== "" && timesValid) ||
    (kind === "weekly" && days.length > 0) ||
    (kind === "frequency" && Number.isFinite(freqNum) && freqNum > 0) ||
    kind === "oneoff";
  const valid =
    label.trim() !== "" &&
    (typicalTime.trim() === "" || (Number.isFinite(timeNum) && timeNum >= 0)) &&
    occurrenceValid;

  function buildOccurrence(): Occurrence {
    switch (kind) {
      case "event":
        return {
          kind: "event",
          date,
          ...(startTime ? { startTime } : {}),
          ...(endTime ? { endTime } : {}),
        };
      case "weekly":
        return {
          kind: "weekly",
          days,
          ...(timeOfDay !== "any" ? { timeOfDay } : {}),
        };
      case "frequency":
        return { kind: "frequency", value: freqNum, unit: freqUnit };
      case "oneoff":
        return { kind: "oneoff" };
    }
  }

  function save() {
    if (!valid || submitting) return;
    onSubmit({
      ...(initial ? { id: initial.id } : {}),
      label: label.trim(),
      ...(typicalTime.trim() === "" ? {} : { typicalTimeMinutes: timeNum }),
      occurrence: buildOccurrence(),
    });
  }

  return (
    <Stack gap="sm" className={styles.taskEditor}>
      <Stack gap="3xs">
        <Text as="label" size="xs" variant="muted">
          What is the activity?
        </Text>
        <Input
          ref={labelRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Play pickleball, Reserve a court"
        />
      </Stack>

      <Inline gap="md" wrap align="end">
        <Stack gap="3xs" className={styles.field}>
          <Text as="label" size="xs" variant="muted">
            When
          </Text>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as OccurrenceKind)}
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

      {kind === "event" && (
        <Inline gap="md" wrap align="end">
          <Stack gap="3xs" className={styles.field}>
            <Text as="label" size="xs" variant="muted">
              Date
            </Text>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Event date"
            />
          </Stack>
          <Stack gap="3xs" className={styles.field}>
            <Text as="label" size="xs" variant="muted">
              Start (optional)
            </Text>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              aria-label="Start time"
            />
          </Stack>
          <Stack gap="3xs" className={styles.field}>
            <Text as="label" size="xs" variant="muted">
              End (optional)
            </Text>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              aria-label="End time"
            />
          </Stack>
        </Inline>
      )}

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
          {submitting ? "Saving..." : initial ? "Save task" : "Add task"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
