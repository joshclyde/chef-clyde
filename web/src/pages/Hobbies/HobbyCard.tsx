import {
  Check,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  Heading,
  Inline,
  Input,
  Stack,
  Text,
  Textarea,
} from "../../ui";
import styles from "./Hobbies.module.css";
import { HobbyTaskEditor } from "./HobbyTaskEditor";
import { describeOccurrence, parseLocalDate, shortDate } from "./occurrence";
import {
  dueStatus,
  type Hobby,
  type HobbyInput,
  type HobbyTask,
  type HobbyTaskInput,
} from "./useHobbies";

function tasksToInput(tasks: HobbyTask[]): HobbyTaskInput[] {
  return tasks.map((t) => ({
    id: t.id,
    label: t.label,
    ...(t.typicalTimeMinutes != null
      ? { typicalTimeMinutes: t.typicalTimeMinutes }
      : {}),
    occurrence: t.occurrence,
  }));
}

/** Readiness badge for cadence tasks; nothing for other kinds. */
function ReadinessBadge({ task }: { task: HobbyTask }) {
  const status = dueStatus(task);
  if (status === null) return null;
  if (status === "never")
    return <Badge className={styles.dueNow}>Due now</Badge>;
  if (status === "overdue")
    return <Badge className={styles.overdue}>Overdue</Badge>;
  return <Badge className={styles.upcoming}>Upcoming</Badge>;
}

type HobbyCardProps = {
  hobby: Hobby;
  onUpdate: (id: string, input: HobbyInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLogSession: (hobbyId: string, taskId: string) => Promise<void>;
  onDeleteSession: (
    hobbyId: string,
    taskId: string,
    completionId: string,
  ) => Promise<void>;
};

export function HobbyCard({
  hobby,
  onUpdate,
  onDelete,
  onLogSession,
  onDeleteSession,
}: HobbyCardProps) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [name, setName] = useState(hobby.name);
  const [notes, setNotes] = useState(hobby.notes ?? "");
  const [addingTask, setAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist(input: HobbyInput) {
    setBusy(true);
    try {
      await onUpdate(hobby.id, input);
    } finally {
      setBusy(false);
    }
  }

  async function saveMeta() {
    if (name.trim() === "") return;
    await persist({
      name: name.trim(),
      notes: notes.trim() || undefined,
      tasks: tasksToInput(hobby.tasks),
    });
    setEditingMeta(false);
  }

  async function addTask(input: HobbyTaskInput) {
    await persist({
      name: hobby.name,
      notes: hobby.notes,
      tasks: [...tasksToInput(hobby.tasks), input],
    });
    setAddingTask(false);
  }

  async function editTask(taskId: string, input: HobbyTaskInput) {
    await persist({
      name: hobby.name,
      notes: hobby.notes,
      tasks: tasksToInput(hobby.tasks).map((t) =>
        t.id === taskId ? input : t,
      ),
    });
    setEditingTaskId(null);
  }

  async function deleteTask(taskId: string) {
    await persist({
      name: hobby.name,
      notes: hobby.notes,
      tasks: tasksToInput(hobby.tasks).filter((t) => t.id !== taskId),
    });
  }

  return (
    <Card className={styles.hobbyCard}>
      {editingMeta ? (
        <Stack gap="2xs">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Hobby name"
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
          />
          <Inline gap="2xs">
            <Button
              size="sm"
              onClick={saveMeta}
              disabled={busy || name.trim() === ""}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(hobby.name);
                setNotes(hobby.notes ?? "");
                setEditingMeta(false);
              }}
            >
              Cancel
            </Button>
          </Inline>
        </Stack>
      ) : (
        <Inline justify="between" align="start">
          <Stack gap="3xs">
            <Heading level={2}>{hobby.name}</Heading>
            {hobby.notes && (
              <Text size="sm" variant="muted">
                {hobby.notes}
              </Text>
            )}
          </Stack>
          <Inline gap="2xs">
            <Button
              size="sm"
              variant="ghost"
              className={styles.iconButton}
              onClick={() => setEditingMeta(true)}
              aria-label="Edit hobby"
            >
              <Pencil size={15} aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={styles.iconButton}
              onClick={() => onDelete(hobby.id)}
              aria-label="Delete hobby"
            >
              <Trash2 size={15} aria-hidden />
            </Button>
          </Inline>
        </Inline>
      )}

      <Stack gap="2xs" className={styles.taskList}>
        {hobby.tasks.length === 0 && !addingTask && (
          <Text size="sm" variant="muted">
            No tasks yet. Add one below.
          </Text>
        )}

        {hobby.tasks.map((task) => {
          const expanded = expandedTaskId === task.id;
          if (editingTaskId === task.id) {
            return (
              <HobbyTaskEditor
                key={task.id}
                initial={task}
                submitting={busy}
                onSubmit={(input) => editTask(task.id, input)}
                onCancel={() => setEditingTaskId(null)}
              />
            );
          }
          return (
            <div key={task.id} className={styles.taskRow}>
              <Inline justify="between" align="start" gap="sm">
                <Stack gap="3xs">
                  <Inline gap="2xs" wrap>
                    <Text size="sm" variant="strong">
                      {task.label}
                    </Text>
                    <ReadinessBadge task={task} />
                  </Inline>
                  <Inline gap="2xs" wrap>
                    <Text size="xs" variant="muted">
                      {describeOccurrence(task)}
                    </Text>
                    {task.typicalTimeMinutes != null && (
                      <Text size="xs" variant="subtle">
                        · {task.typicalTimeMinutes} min
                      </Text>
                    )}
                    {task.completions.length > 0 && (
                      <button
                        type="button"
                        className={styles.historyToggle}
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedTaskId(expanded ? null : task.id)
                        }
                      >
                        {expanded ? (
                          <ChevronDown size={13} aria-hidden />
                        ) : (
                          <ChevronRight size={13} aria-hidden />
                        )}
                        {task.completions.length} done
                      </button>
                    )}
                  </Inline>
                </Stack>
                <Inline gap="2xs">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onLogSession(hobby.id, task.id)}
                  >
                    <Check size={14} aria-hidden /> Log
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={styles.iconButton}
                    onClick={() => setEditingTaskId(task.id)}
                    aria-label="Edit task"
                  >
                    <Pencil size={15} aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={styles.iconButton}
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                  >
                    <Trash2 size={15} aria-hidden />
                  </Button>
                </Inline>
              </Inline>

              {expanded && (
                <Stack gap="3xs" className={styles.history}>
                  {[...task.completions]
                    .sort(
                      (a, b) =>
                        new Date(b.performedAt).getTime() -
                        new Date(a.performedAt).getTime(),
                    )
                    .map((c) => (
                      <Inline key={c.id} justify="between">
                        <Text size="xs" variant="muted">
                          {shortDate(
                            parseLocalDate(c.performedAt.slice(0, 10)),
                          )}
                        </Text>
                        <button
                          type="button"
                          className={styles.removeCompletion}
                          onClick={() =>
                            onDeleteSession(hobby.id, task.id, c.id)
                          }
                          aria-label="Remove session"
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </Inline>
                    ))}
                </Stack>
              )}
            </div>
          );
        })}

        {addingTask ? (
          <HobbyTaskEditor
            submitting={busy}
            onSubmit={addTask}
            onCancel={() => setAddingTask(false)}
          />
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className={styles.addTaskButton}
            onClick={() => setAddingTask(true)}
          >
            <Plus size={15} aria-hidden /> Add task
          </Button>
        )}
      </Stack>
    </Card>
  );
}
