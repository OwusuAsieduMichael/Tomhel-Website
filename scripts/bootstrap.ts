/**
 * First-time setup of a real (production) BECE Prep sheet: tabs, the 10 BECE subjects, your classes,
 * and the first admin account. No demo accounts, no shared passwords.
 *
 * Usage:
 *   npm run prep:bootstrap -- --admin-id A0001 --admin-name "Ama Mensah" --classes "JHS 3A,JHS 3B" --year 2026/2027
 *
 * Safe to re-run: existing subjects, classes and accounts are left as they are.
 * The admin's temporary password is printed once; they must change it at first login.
 */
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { createAccount } from "../src/lib/prep/admin/people";
import { normaliseLoginId } from "../src/lib/prep/auth/login";
import { seedSubjects } from "../src/lib/prep/seed/data";
import { insert, LOCAL_DATA_FILE, newId, storeFromEnv, type WriteOp } from "../src/lib/prep/store";

config({ path: ".env.local" });

async function main() {
  const { values } = parseArgs({
    options: {
      "admin-id": { type: "string" },
      "admin-name": { type: "string" },
      classes: { type: "string", default: "" },
      year: { type: "string" },
    },
  });
  const adminId = values["admin-id"];
  const adminName = values["admin-name"];
  const classNames = values.classes!.split(",").map((c) => c.trim().replace(/\s+/g, " ")).filter(Boolean);
  if (!adminId || !adminName || (classNames.length && !values.year)) {
    throw new Error('Usage: npm run prep:bootstrap -- --admin-id A0001 --admin-name "Full Name" --classes "JHS 3A,JHS 3B" --year 2026/2027');
  }
  if (values.year && !/^\d{4}\/\d{4}$/.test(values.year)) throw new Error('--year looks like "2026/2027".');

  const store = storeFromEnv({ cache: false });
  console.log(process.env.PREP_GAS_URL ? "Target: Google Sheet (PREP_GAS_URL)" : `Target: local demo file ${LOCAL_DATA_FILE}`);
  await store.setup();

  const { subjects, classes, users } = await store.read("subjects", "classes", "users");
  const ops: WriteOp[] = [];

  const newSubjects = seedSubjects
    .map((s, sortOrder) => ({ id: newId(), code: s.code, name: s.name, autoMarkTheory: s.autoMarkTheory, sortOrder }))
    .filter((s) => !subjects.some((x) => x.code === s.code));
  if (newSubjects.length) ops.push(insert("subjects", newSubjects, { unique: ["code"] }));

  const newClasses = classNames
    .filter((name) => !classes.some((c) => c.name.toUpperCase() === name.toUpperCase() && c.academicYear === values.year))
    .map((name) => {
      const yearGroup = Number(/JHS\s*([123])/i.exec(name)?.[1]);
      if (!yearGroup) throw new Error(`Can't tell the year group of "${name}". Class names start with JHS 1, JHS 2 or JHS 3.`);
      return { id: newId(), name, yearGroup, academicYear: values.year!, createdAt: new Date() };
    });
  if (newClasses.length) ops.push(insert("classes", newClasses));

  await store.write(ops);
  console.log(`Subjects: ${newSubjects.length} added (${subjects.length + newSubjects.length} in total)`);
  console.log(`Classes: ${newClasses.length ? newClasses.map((c) => c.name).join(", ") + " added" : "nothing new"}`);

  if (users.some((u) => u.loginId === normaliseLoginId(adminId))) {
    console.log(`Admin ${normaliseLoginId(adminId)} already exists; left unchanged.`);
  } else {
    const { tempPassword } = await createAccount(store, { loginId: adminId, name: adminName, role: "admin" });
    console.log(`\nAdmin account created. Log in at /prep/login with:`);
    console.log(`  ID:                 ${normaliseLoginId(adminId)}`);
    console.log(`  Temporary password: ${tempPassword}`);
    console.log("This is shown only once. The portal asks for a new password at first login.");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
