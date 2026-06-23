import { useMemo } from "react";

import { Heading, Stack, Text } from "../../ui";
import chipStyles from "./chip.module.css";
import { DAY_PART_LABEL, DAY_PARTS } from "./constants";
import {
  describeOccurrence,
  landsOn,
  localIsoDate,
  mondayOf,
  weekDates,
  weekdayOf,
} from "./occurrence";
import styles from "./OpenTimeGrid.module.css";
import type { Routine } from "./useRoutines";

type Props = {
  routines: Routine[];
};

/**
 * A day-part × weekday matrix of the current week. Filled cells show the
 * routines committed to that slot; empty cells render as dashed "open" slots so
 * the user can see, at a glance, where their week has room for a new routine.
 *
 * Only routines that land on a fixed weekday appear here (see `landsOn`):
 * weekly routines and daily cadences. Coarser cadences and "anytime" routines
 * have no fixed slot and stay in the "Your typical day" / "Anytime" sections.
 */
export default function OpenTimeGrid({ routines }: Props) {
  const today = localIsoDate(new Date());
  const week = useMemo(() => weekDates(mondayOf(new Date())), []);

  // Routines committed to each (day-part, date) cell, keyed "part|YYYY-MM-DD".
  const cells = useMemo(() => {
    const map = new Map<string, Routine[]>();
    for (const part of DAY_PARTS) {
      for (const date of week) {
        const items = routines.filter(
          (r) => r.timeOfDay === part && landsOn(r, weekdayOf(date)),
        );
        map.set(`${part}|${localIsoDate(date)}`, items);
      }
    }
    return map;
  }, [routines, week]);

  return (
    <Stack gap="2xs">
      <Heading level={2}>Open time this week</Heading>
      <Text variant="muted" size="sm">
        Dashed cells are open time — room for a new routine.
      </Text>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <td className={styles.corner} aria-hidden />
              {week.map((date) => {
                const isToday = localIsoDate(date) === today;
                return (
                  <th
                    key={date.toISOString()}
                    scope="col"
                    className={`${styles.colHead} ${isToday ? styles.today : ""}`}
                  >
                    {weekdayOf(date)}{" "}
                    <span className={styles.colDate}>{date.getDate()}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {DAY_PARTS.map((part) => (
              <tr key={part}>
                <th scope="row" className={styles.rowHead}>
                  {DAY_PART_LABEL[part]}
                </th>
                {week.map((date) => {
                  const isToday = localIsoDate(date) === today;
                  const items = cells.get(`${part}|${localIsoDate(date)}`) ?? [];
                  const open = items.length === 0;
                  return (
                    <td
                      key={date.toISOString()}
                      className={`${styles.cell} ${isToday ? styles.today : ""} ${open ? styles.open : ""}`}
                    >
                      {open ? (
                        <span
                          className={styles.openMark}
                          title="Open — no routine"
                          aria-label="Open — no routine"
                        >
                          +
                        </span>
                      ) : (
                        <span className={styles.cellItems}>
                          {items.map((routine) => (
                            <span
                              key={routine.id}
                              className={`${chipStyles.chip} ${chipStyles[part]}`}
                              title={describeOccurrence(routine)}
                            >
                              {routine.label}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}
