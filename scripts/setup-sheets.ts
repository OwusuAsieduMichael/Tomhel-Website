/**
 * Create the BECE Prep tabs and columns in the Google Sheet (or the local demo file).
 * Usage: npm run prep:setup
 *
 * Safe to re-run: adds missing tabs and columns, never deletes or reorders anything.
 * Run it after adding a column to src/lib/prep/store/schema.ts.
 */
import { config } from "dotenv";
import { LOCAL_DATA_FILE, storeFromEnv } from "../src/lib/prep/store";

config({ path: ".env.local" });

async function main() {
  const store = storeFromEnv({ cache: false });
  console.log(process.env.PREP_GAS_URL ? "Target: Google Sheet (PREP_GAS_URL)" : `Target: local demo file ${LOCAL_DATA_FILE}`);
  const { created, addedColumns } = await store.setup();
  console.log(created.length ? `Created tabs: ${created.join(", ")}` : "All tabs already exist.");
  for (const [tab, cols] of Object.entries(addedColumns)) console.log(`  ${tab}: added ${cols.join(", ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
