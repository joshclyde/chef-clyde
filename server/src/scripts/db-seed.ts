/**
 * Seed a test/development database with the committed fixtures in
 * `server/fixtures/`. Never touches production: the script aborts if the target
 * resolves to the production data directory.
 *
 * Usage (from server/):
 *   npm run db:seed            # seed the DB_PATH from .env, skipping existing files
 *   npm run db:seed -- --force # overwrite existing files for a clean reset
 *   npm run db:seed -- /tmp/db # seed an explicit directory instead of DB_PATH
 */
import path from "path";

import { copyTree } from "./copyTree";

const FIXTURES_DIR = path.resolve(__dirname, "..", "..", "fixtures");

// A path is "production" if it ends in chef-clyde-data/production — the
// canonical location real data is relocated to. Guards against clobbering it.
const PRODUCTION_MARKER = path.join("chef-clyde-data", "production");

function main(): void {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const explicitTarget = args.find((a) => !a.startsWith("--"));

  const target = explicitTarget ?? process.env.DB_PATH;
  if (!target) {
    throw new Error(
      "No target. Set DB_PATH (e.g. via .env) or pass a directory argument.",
    );
  }

  const resolved = path.resolve(target);
  if (resolved.includes(PRODUCTION_MARKER)) {
    throw new Error(
      `Refusing to seed: "${resolved}" looks like the production database.`,
    );
  }

  copyTree(FIXTURES_DIR, resolved, force);

  console.log(
    `Seeded fixtures into ${resolved}${force ? " (overwrote existing)" : " (skipped existing)"}.`,
  );
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
