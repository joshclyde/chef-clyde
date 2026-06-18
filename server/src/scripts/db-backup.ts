/**
 * Back up the database that DB_PATH points at into a timestamped folder. Run
 * this from the production environment (where DB_PATH is the production data
 * directory) to replace the manual daily copy.
 *
 * Usage (from server/):
 *   npm run db:backup              # back up DB_PATH into ~/chef-clyde-data/backups/<ts>
 *   npm run db:backup -- /tmp/db   # back up an explicit directory
 *   BACKUP_DIR=/path npm run db:backup   # override where backups are written
 */
import fs from "fs";
import os from "os";
import path from "path";

import { copyTree } from "./copyTree";

function main(): void {
  const explicitSource = process.argv.slice(2).find((a) => !a.startsWith("--"));
  const source = explicitSource ?? process.env.DB_PATH;
  if (!source) {
    throw new Error(
      "No source. Set DB_PATH (e.g. via .env) or pass a directory argument.",
    );
  }

  const resolvedSource = path.resolve(source);
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Source database does not exist: ${resolvedSource}`);
  }

  // Compact, sortable UTC stamp, e.g. 20260617T090000Z.
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "Z");
  const backupRoot =
    process.env.BACKUP_DIR ??
    path.join(os.homedir(), "chef-clyde-data", "backups");
  const dest = path.join(backupRoot, stamp);

  copyTree(resolvedSource, dest, true);

  console.log(`Backed up ${resolvedSource} -> ${dest}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
