/**
 * Today's date as a local "YYYY-MM-DD" string. The "en-CA" locale is a
 * formatting trick: it renders dates in ISO `YYYY-MM-DD` order using the local
 * timezone, which is the exact shape schedules are keyed by (so there is no
 * UTC off-by-one shift, unlike `toISOString().slice(0, 10)`). This is not
 * region-specific — keep it "en-CA" regardless of the user's locale.
 */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}
