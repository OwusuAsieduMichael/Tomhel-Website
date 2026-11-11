# BECE Prep Portal — Google Sheets Backend

The BECE Prep portal (`/prep`) stores its data in a Google Sheet, through a Google Apps Script web app, the same way the website's admission and contact forms do. It uses its **own** spreadsheet and script: student accounts and results stay separate from the admissions sheet that the office shares.

## Architecture

```
Browser (students, teachers, admin)
    ↓  pages and form actions
Next.js server (all rules: logins, permissions, validation, password hashing)
    ↓  POST JSON + secret: read tabs / write a batch of changes
Google Apps Script web app  (google-apps-script/prep/Code.gs)
    ↓
Google Sheet "Tomhel BECE Prep Database"  (one tab per table)
```

- **Passwords never reach Google.** The website hashes them (scrypt) before saving; the sheet only holds hashes.
- **Logins don't wait on Google.** A signed cookie identifies the user. Pages read the sheet through a short cache that the website clears whenever it saves a change.
- **Saves are all-or-nothing.** Each batch of changes is checked in full under a lock before anything is written.
- **Without Google (development and demos):** if `PREP_GAS_URL` is empty, the portal uses a local file, `.prep-local/data.json`, with the same rules. No Google setup is needed to run or demo it.

## Run a local demo (no Google account needed)

```bash
# .env.local
SEED_PASSWORD=choose-a-demo-password

npm run prep:seed   # creates demo classes, subjects, staff, students and two sample papers
npm run dev         # open http://localhost:3000/prep/login
```

Log in as `A0001` (admin), `T001` to `T003` (teachers) or `S0001` to `S0010` (students), all with `SEED_PASSWORD`.

## Connect the real Google Sheet

### 1. Create the spreadsheet

Create a Google Sheet named **Tomhel BECE Prep Database**, owned by the school's Google account. Copy its ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.

Don't create tabs yourself; step 5 creates them.

### 2. Add the script

In the spreadsheet: **Extensions → Apps Script**. Replace the default code with the contents of `google-apps-script/prep/Code.gs`. Save the project as **Tomhel BECE Prep API**.

### 3. Script Properties

**Project Settings → Script Properties**:

| Property | Value |
|---|---|
| `SPREADSHEET_ID` | The ID from step 1 |
| `API_SECRET` | A long random string, **at least 32 characters**. Required: the script refuses every request without it. |

Generate a secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

### 4. Deploy

**Deploy → New deployment → Web app**, Execute as **Me**, Who has access **Anyone**. Authorize when asked (Sheets access only; this script sends no email). Copy the web app URL.

After any change to `Code.gs`: **Deploy → Manage deployments → Edit → New version → Deploy**.

### 5. Configure the website

In `.env.local`, and in Vercel → Environment Variables:

```env
PREP_GAS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
PREP_GAS_SECRET=the-same-value-as-API_SECRET
PREP_SESSION_SECRET=another-long-random-string-32-plus-characters
```

Then create the tabs and, for a staging or demo sheet only, load the demo data:

```bash
npm run prep:setup  # creates the tabs and column headers; safe to re-run
npm run prep:seed   # optional, refuses to run in production
```

**After every website update, run `npm run prep:setup` again** (it is safe to repeat). New features add tabs, such as `Attempts` for practice papers, and the portal shows `Sheet "…" not found` until they exist. `prep:seed` and `prep:import` run it for you.

To add past papers, see [PAST_PAPERS.md](PAST_PAPERS.md).

For the live (production) sheet, never use `prep:seed`: it creates demo accounts with a shared password. Use `prep:bootstrap` instead. It creates the 10 subjects, your classes and the first admin, and prints the admin's one-time password:

```bash
npm run prep:bootstrap -- --admin-id A0001 --admin-name "Full Name" --classes "JHS 3A,JHS 3B" --year 2026/2027
```

Then log in as that admin, choose a new password, and import students on the People page.

## The tabs

| Tab | Holds |
|---|---|
| Users | Students, teachers and admins (ID, name, role, class, password hash, lockout and sign-in state) |
| Classes | e.g. JHS 3A, year group, academic year |
| Subjects | The 10 BECE subjects; French and Twi are marked by teachers |
| TeacherSubjects | Which teacher takes which subject (and optionally which class) |
| Papers | Past papers: subject, year, Paper 1 or 2 |
| Questions | Question text, marks, type, draft or approved |
| McqOptions, MarkingPoints, ModelAnswers | Answers and marking schemes for each question |
| Attempts | Each student's practice papers: their answers, marks and timing (answers and marking are JSON in one row). `assignmentId` is set when the attempt is work a teacher assigned |
| Assignments | Work teachers set for classes (a past paper, a topic quiz or questions picked from the bank): open and close dates, time limit, attempts allowed, when solutions are shown, draft or published |
| Notices | In-app messages to students: new work, reminders, marks returned, queries answered |
| MarkQueries | Students asking a teacher to check the mark for one question, and the teacher's reply |
| Topics | Curriculum strands used to tag questions |

Row 1 of each tab is the header. Every cell is plain text. The `id` column links rows across tabs: don't edit it.

**Editing by hand:** names, classes and question text can be corrected directly in the sheet, and the website picks up the change within a minute. Use the website for anything involving passwords or accounts. Never type into `passwordHash` or `sessionVersion`.

## Security checklist

1. Share the spreadsheet with as few people as possible (the administrator only). It contains password hashes and, in later phases, results.
2. Keep `PREP_GAS_URL`, `PREP_GAS_SECRET` and `PREP_SESSION_SECRET` server-side. Never prefix them with `NEXT_PUBLIC_`.
3. Use different secrets from the forms script (`GAS_API_SECRET`).
4. If a secret leaks: change `API_SECRET` in Script Properties and `PREP_GAS_SECRET` in Vercel together. Changing `PREP_SESSION_SECRET` signs everyone out.

## Limits to know

- **Speed:** a read from Google takes about 1 second. Cached pages are instant; the first load after a change or after a minute takes about a second.
- **Size:** comfortable for one school (thousands of students and questions). Each save rewrites the tabs it changes, so very large tabs make saves slower.
- **Busy moments:** Apps Script runs a limited number of requests at once (about 30), and saves queue behind a lock. Caching keeps normal use well under this, but a whole year group logging in in the same minute will feel slower. Check Google's current [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) for the school's account type.

## Troubleshooting

| Problem | Fix |
|---|---|
| "API_SECRET is not configured" | Add `API_SECRET` (32+ characters) in Script Properties |
| "Unauthorized." | `PREP_GAS_SECRET` must exactly match `API_SECRET` |
| `Sheet "Users" not found` | Run `npm run prep:setup` |
| `missing the column "…"` | Someone renamed or deleted a header; run `npm run prep:setup` to add it back |
| `can't read "…"` in a column | A cell was edited by hand into an invalid value (e.g. `maybe` in a TRUE/FALSE column); fix the cell |
| Changes to Code.gs have no effect | Deploy a new version (step 4) |
| "PREP_GAS_URL is not set" in production | Add the three `PREP_` variables in Vercel and redeploy |
