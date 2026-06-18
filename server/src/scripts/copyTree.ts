import fs from "fs";
import path from "path";

/**
 * Recursively copy `src` into `dest`, creating directories as needed (mirrors the
 * `fs.mkdirSync(..., { recursive: true })` pattern in `src/db/`). When
 * `overwrite` is false, files that already exist in `dest` are left untouched —
 * this is what makes seeding idempotent. Uses only stable fs APIs.
 */
export function copyTree(src: string, dest: string, overwrite: boolean): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to, overwrite);
    } else if (entry.isFile()) {
      if (!overwrite && fs.existsSync(to)) continue;
      fs.copyFileSync(from, to);
    }
  }
}
