import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button, Heading, Inline, Input, Stack, Text, Textarea } from "../../ui";
import {
  type Chore,
  dueSortKey,
  dueStatus,
  nextDue,
  useChores,
} from "../Chores/useChores";
import { describeOccurrence } from "../Hobbies/occurrence";
import {
  dueStatus as hobbyDueStatus,
  type Hobby,
  useHobbies,
} from "../Hobbies/useHobbies";
import {
  dueSortKey as todoDueSortKey,
  dueStatus as todoDueStatus,
  type Todo,
  useTodos,
} from "../Todos/useTodos";
import styles from "./Schedule.module.css";
import type { Schedule } from "./useSchedules";

/** "Mon, Jun 8" from a "YYYY-MM-DD" string, with no timezone shift. */
function shortDateStr(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "Jun 8" from a Date, or "—" when null. */
function shortDate(date: Date | null) {
  return date
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "—";
}

/** Parse a "YYYY-MM-DD" string into a local Date (no timezone shift). */
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** A labeled group inside the "what Clyde will use" panel. */
function ContextGroup({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="2xs">
      <Inline justify="between">
        <Text size="xs" variant="muted" className={styles.groupTitle}>
          {title}
        </Text>
        {action}
      </Inline>
      {children}
    </Stack>
  );
}

/** The chore's readiness, mirroring the Chores page's due styling. */
function DueBadge({ chore }: { chore: Chore }) {
  const status = dueStatus(chore);
  if (status === "never") {
    return (
      <Text size="xs" variant="strong">
        Due now
      </Text>
    );
  }
  if (status === "overdue") {
    return (
      <Text size="xs" variant="danger">
        Overdue
      </Text>
    );
  }
  return (
    <Text size="xs" variant="muted">
      Due {shortDate(nextDue(chore))}
    </Text>
  );
}

/** The chores, sorted most-in-need-first — exactly what the prompt prioritizes. */
function ChoresContext({ chores }: { chores: Chore[] }) {
  const sorted = useMemo(
    () => [...chores].sort((a, b) => dueSortKey(a) - dueSortKey(b)),
    [chores],
  );
  return (
    <ContextGroup title={`Chores being considered (${chores.length})`}>
      {chores.length === 0 ? (
        <Text size="sm" variant="muted">
          No chores recorded.
        </Text>
      ) : (
        <Stack gap="3xs">
          {sorted.map((chore) => (
            <div key={chore.id} className={styles.contextRow}>
              <Text size="sm">{chore.name}</Text>
              <DueBadge chore={chore} />
            </div>
          ))}
        </Stack>
      )}
    </ContextGroup>
  );
}

/** A to-do's readiness, mirroring the Chores due styling. */
function TodoDueBadge({ todo }: { todo: Todo }) {
  const status = todoDueStatus(todo);
  if (status === "overdue") {
    return (
      <Text size="xs" variant="danger">
        Overdue
      </Text>
    );
  }
  if (status === "today") {
    return (
      <Text size="xs" variant="strong">
        Due today
      </Text>
    );
  }
  if (status === "upcoming") {
    return (
      <Text size="xs" variant="muted">
        Due {shortDate(todo.dueDate ? parseLocalDate(todo.dueDate) : null)}
      </Text>
    );
  }
  return (
    <Text size="xs" variant="muted">
      No due date
    </Text>
  );
}

/** The open to-dos being considered, sorted most-due-first, like the prompt. */
function TodosContext({ todos }: { todos: Todo[] }) {
  const open = useMemo(
    () =>
      todos
        .filter((t) => !t.completedAt)
        .sort((a, b) => todoDueSortKey(a) - todoDueSortKey(b)),
    [todos],
  );
  return (
    <ContextGroup title={`To-dos being considered (${open.length})`}>
      {open.length === 0 ? (
        <Text size="sm" variant="muted">
          No open to-dos.
        </Text>
      ) : (
        <Stack gap="3xs">
          {open.map((todo) => (
            <div key={todo.id} className={styles.contextRow}>
              <Text size="sm">{todo.title}</Text>
              <TodoDueBadge todo={todo} />
            </div>
          ))}
        </Stack>
      )}
    </ContextGroup>
  );
}

/** The hobby tasks the generator can draw on, with each task's cadence summary. */
function HobbiesContext({ hobbies }: { hobbies: Hobby[] }) {
  const tasks = useMemo(
    () => hobbies.flatMap((h) => h.tasks.map((task) => ({ hobby: h, task }))),
    [hobbies],
  );
  return (
    <ContextGroup title={`Hobby tasks being considered (${tasks.length})`}>
      {tasks.length === 0 ? (
        <Text size="sm" variant="muted">
          No hobby tasks recorded.
        </Text>
      ) : (
        <Stack gap="3xs">
          {tasks.map(({ hobby, task }) => {
            const status = hobbyDueStatus(task);
            return (
              <div key={task.id} className={styles.contextRow}>
                <Text size="sm">
                  {hobby.name} — {task.label}
                </Text>
                <Text
                  size="xs"
                  variant={status === "overdue" ? "danger" : "muted"}
                >
                  {status === "never"
                    ? "Due now"
                    : status === "overdue"
                      ? "Overdue"
                      : describeOccurrence(task)}
                </Text>
              </div>
            );
          })}
        </Stack>
      )}
    </ContextGroup>
  );
}

/** The standing instructions applied to every generation, with a link to edit. */
function InstructionsContext() {
  const [instructions, setInstructions] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/schedule-instructions")
      .then((res) => res.json())
      .then((data: { instructions: string }) =>
        setInstructions(data.instructions),
      )
      .catch(() => setInstructions(""));
  }, []);
  return (
    <ContextGroup
      title="Standing instructions"
      action={
        <Link to="/schedule/instructions" className={styles.textToggle}>
          Edit
        </Link>
      }
    >
      <Text size="sm" variant={instructions ? undefined : "muted"} className={styles.content}>
        {instructions === null
          ? "Loading…"
          : instructions || "None yet."}
      </Text>
    </ContextGroup>
  );
}

/** A digest of the last 7 days of outcomes the model is told about. */
function HistoryContext({ schedules }: { schedules: Schedule[] }) {
  const recent = useMemo(() => {
    const window = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      window.add(d.toLocaleDateString("en-CA"));
    }
    return schedules
      .filter((s) => window.has(s.date) && s.tasks && s.tasks.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules]);

  return (
    <ContextGroup title="Recent task history">
      {recent.length === 0 ? (
        <Text size="sm" variant="muted">
          No task history in the last 7 days.
        </Text>
      ) : (
        <Stack gap="3xs">
          {recent.map((s) => {
            const total = s.tasks!.length;
            const resolved = s.tasks!.filter(
              (t) => t.status !== "pending",
            ).length;
            return (
              <div key={s.id} className={styles.contextRow}>
                <Text size="sm">{shortDateStr(s.date)}</Text>
                <Text size="xs" variant="muted">
                  {resolved}/{total} resolved
                </Text>
              </div>
            );
          })}
        </Stack>
      )}
    </ContextGroup>
  );
}

/** Collapsible view of the exact prompt string the generator will send. */
function RawPromptPreview({
  date,
  dayContext,
  previewPrompt,
}: {
  date: string;
  dayContext: string;
  previewPrompt: (date: string, dayContext: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    // Re-fetch on each open so the preview reflects the latest day-context draft.
    setLoading(true);
    setError(null);
    try {
      setPrompt(await previewPrompt(date, dayContext));
    } catch {
      setError("Failed to load prompt preview.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="2xs">
      <button
        type="button"
        className={styles.textToggle}
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? (
          <ChevronDown size={16} aria-hidden />
        ) : (
          <ChevronRight size={16} aria-hidden />
        )}
        Raw prompt preview
      </button>
      {open &&
        (loading ? (
          <Text size="sm" variant="muted">
            Loading…
          </Text>
        ) : error ? (
          <Text size="sm" variant="danger">
            {error}
          </Text>
        ) : (
          <pre className={styles.promptPreview}>{prompt}</pre>
        ))}
    </Stack>
  );
}

/**
 * The day's planning surface: edit the one-off day context, see every data
 * point that feeds the model, preview the exact prompt, and generate the task
 * list in a single step. Caller wraps this in a Card.
 */
export function ScheduleGenerator({
  heading,
  initialDate,
  allowDateEdit = false,
  schedule,
  schedules,
  onSave,
  onGenerate,
  previewPrompt,
  onClose,
}: {
  heading?: string;
  initialDate: string;
  allowDateEdit?: boolean;
  schedule?: Schedule;
  schedules: Schedule[];
  onSave: (date: string, dayContext: string) => Promise<Schedule>;
  onGenerate: (id: string) => Promise<Schedule>;
  previewPrompt: (date: string, dayContext: string) => Promise<string>;
  onClose?: () => void;
}) {
  const { chores } = useChores();
  const { todos } = useTodos();
  const { hobbies } = useHobbies();
  const [date, setDate] = useState(initialDate);
  const [draft, setDraft] = useState(schedule?.dayContext ?? "");
  const [busy, setBusy] = useState<null | "save" | "generate">(null);
  const [error, setError] = useState<string | null>(null);

  const hasTasks = (schedule?.tasks?.length ?? 0) > 0;

  async function save() {
    setBusy("save");
    setError(null);
    try {
      await onSave(date, draft);
      onClose?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save day context.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy("generate");
    setError(null);
    try {
      // Persist the latest notes first so the generation sees them, then plan.
      const saved = await onSave(date, draft);
      await onGenerate(saved.id);
      onClose?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate task list.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Stack gap="md">
      {heading && <Heading level={2}>{heading}</Heading>}

      <Stack gap="3xs">
        <Text as="label" size="xs" variant="muted">
          Day context
        </Text>
        {allowDateEdit && (
          <Input
            className={styles.dateInput}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Schedule date"
          />
        )}
        <Textarea
          className={styles.editField}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Anything special about this day? e.g. 'dinner at a friend's at 7pm' or 'grocery shop today instead of Sunday'"
        />
      </Stack>

      <div className={styles.contextPanel}>
        <Text size="xs" variant="muted">
          What Clyde will use to plan this day
        </Text>
        <ChoresContext chores={chores} />
        <TodosContext todos={todos} />
        <HobbiesContext hobbies={hobbies} />
        <InstructionsContext />
        <HistoryContext schedules={schedules} />
      </div>

      <RawPromptPreview
        date={date}
        dayContext={draft}
        previewPrompt={previewPrompt}
      />

      {error && (
        <Text variant="danger" size="sm">
          {error}
        </Text>
      )}

      <Inline gap="2xs">
        <Button
          size="sm"
          variant="ai"
          onClick={generate}
          disabled={busy !== null}
        >
          <Sparkles size={16} strokeWidth={2} aria-hidden />
          {busy === "generate"
            ? "Generating..."
            : hasTasks
              ? "Re-generate task list"
              : "Generate task list"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={save}
          disabled={busy !== null}
        >
          {busy === "save" ? "Saving..." : "Save notes"}
        </Button>
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            disabled={busy !== null}
          >
            Cancel
          </Button>
        )}
      </Inline>
    </Stack>
  );
}
