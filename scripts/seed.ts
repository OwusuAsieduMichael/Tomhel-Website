/**
 * Load demo data (2 classes, 10 subjects, 3 teachers, 1 admin, 10 students, 2 sample papers).
 * Usage: npm run prep:seed
 *
 * Goes to the Google Sheet when PREP_GAS_URL is set in .env.local, otherwise to the local demo file.
 * Creates any missing tabs first. Safe to re-run: existing accounts keep their passwords.
 * Refuses to run in production because it creates accounts with a shared known password.
 */
import { config } from "dotenv";
import { seedAdmin, seedStudents, seedTeachers } from "../src/lib/prep/seed/data";
import { seedDatabase } from "../src/lib/prep/seed/seed";
import { LOCAL_DATA_FILE, storeFromEnv } from "../src/lib/prep/store";

config({ path: ".env.local" });

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed demo accounts into production.");
  }
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Set SEED_PASSWORD (8+ characters) in .env.local. It becomes the password for every new demo account.");
  }

  const store = storeFromEnv({ cache: false });
  console.log(process.env.PREP_GAS_URL ? "Target: Google Sheet (PREP_GAS_URL)" : `Target: local demo file ${LOCAL_DATA_FILE}`);
  await store.setup();
  const summary = await seedDatabase(store, { password });
  console.log("Seed complete:", summary);
  console.log("\nLog in at /prep/login with SEED_PASSWORD and any of these IDs:");
  console.log(`  Admin:    ${seedAdmin.loginId}`);
  console.log(`  Teachers: ${seedTeachers.map((t) => t.loginId).join(", ")}`);
  console.log(`  Students: ${seedStudents.map((s) => s.loginId).join(", ")}`);
  console.log("(Existing accounts keep their current password.)");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
