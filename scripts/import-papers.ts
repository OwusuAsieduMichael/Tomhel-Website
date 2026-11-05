/**
 * Import paper files (the JSON format from Admin > Questions > Export, or from scripts/pasco/*).
 * Usage: npm run prep:import -- private/papers/SCI-2021-P1.json [more files...] [--approve]
 *
 * Same rules as the admin upload: validated in full, nothing saved if anything is wrong,
 * new and changed questions arrive as drafts. --approve also approves every draft on the
 * imported papers, so students can see them straight away (for demos; normally an admin reviews first).
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { approveAllOnPaper, importPaper } from "../src/lib/prep/admin/question-bank";
import { LOCAL_DATA_FILE, storeFromEnv } from "../src/lib/prep/store";

config({ path: ".env.local" });

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { approve: { type: "boolean", default: false } } });
  const files = positionals.filter((f) => f.endsWith(".json"));
  if (!files.length) throw new Error("Usage: npm run prep:import -- <paper.json> [more.json] [--approve]");

  const store = storeFromEnv({ cache: false });
  console.log(process.env.PREP_GAS_URL ? "Target: Google Sheet (PREP_GAS_URL)" : `Target: local demo file ${LOCAL_DATA_FILE}`);
  // Adds any tabs/columns a newer version of the app needs. Safe to repeat.
  await store.setup();

  let failed = 0;
  for (const file of files) {
    const result = await importPaper(store, JSON.parse(readFileSync(file, "utf8")));
    if (!result.ok) {
      failed++;
      console.log(`\n✗ ${file}: nothing imported`);
      for (const p of result.problems) console.log(`   - ${p}`);
      continue;
    }
    const approved = values.approve ? await approveAllOnPaper(store, result.paperId) : 0;
    console.log(
      `✓ ${file}: ${result.created} new, ${result.changed} changed, ${result.unchanged} unchanged` +
        (approved ? `, ${approved} approved` : values.approve ? "" : " (drafts: approve them on Admin > Questions)"),
    );
    if (result.notInFile.length) console.log(`   kept, not in file: ${result.notInFile.join(", ")}`);
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
