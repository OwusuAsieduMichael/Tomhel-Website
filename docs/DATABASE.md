# The database (Supabase)

BECE Prep keeps its data in the Google Sheet. The Sheet has limits (big tabs, Apps Script quotas), so the
newer features keep their tables in a Postgres database instead, and the rest will move there in time.

**Today:** the parent accounts (`Parents`, `ParentLinks`). They are listed in `DATABASE_TABLES` in
`src/lib/prep/store/schema.ts`.

- With `PREP_DATABASE_URL` set, those tables live in the database; everything else stays in the Sheet.
- Without it, they are tabs in the Sheet like the rest, so the features work before the database exists.

The code doesn't care which: both stores behave the same (the same tests run against both, see
`tests/integration/postgres-backend.test.ts`).

## Setting it up (about 10 minutes, once)

1. Create a free project at [supabase.com](https://supabase.com). Choose a region near Ghana (e.g. Europe West)
   and save the database password somewhere safe.
2. In the project, click **Connect** and copy the **Transaction pooler** connection string (port 6543). Put
   the database password into it where it says `[YOUR-PASSWORD]`.
3. Add it to `.env.local`:

   ```
   PREP_DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-eu-west-2.pooler.supabase.com:6543/postgres
   ```

4. Copy the parent accounts across from the Sheet (safe to repeat; the Sheet's tabs stay as a backup):

   ```bash
   npm run prep:move-to-database
   ```

5. In Vercel → Project → Settings → Environment Variables, add `PREP_DATABASE_URL` (Production) with the same
   value, then deploy the latest commit.

From then on, parent accounts are saved in Supabase. Don't make parent accounts between steps 4 and 5:
they would be saved in the Sheet and not copied (running step 4 again copies them).

## Adding a table to the database

Add it to `tables` in `schema.ts` and to `DATABASE_TABLES`, then run `npm run prep:setup` (creates it in the
database, or in the Sheet when there is no database).
