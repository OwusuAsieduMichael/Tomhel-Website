# Tomhel Website — Google Apps Script Form Backend

This guide sets up Google Sheets and Google Apps Script as the backend for admission applications, contact messages, and school visit requests. Parents never see Google Forms — all submissions go through the Tomhel website.

## Architecture

```
Website (Next.js forms)
    ↓ POST /api/admissions | /api/messages | /api/visit-request
Next.js API proxy (keeps GAS URL secret, avoids CORS)
    ↓ POST JSON to Google Apps Script Web App
Google Sheets (Tomhel School Website Database)
    ↓
Gmail notifications → Headmaster + submitter
```

## 1. Create the Google Spreadsheet

1. Open [Google Sheets](https://sheets.google.com) and create a spreadsheet named **Tomhel School Website Database**.
2. Create three tabs with these exact names:
   - `Admissions`
   - `Messages`
   - `VisitRequests`
3. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

You can auto-create headers by running `setupSheets()` in Apps Script (step 3).

## 2. Add the Apps Script

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete any default code and paste the contents of `google-apps-script/Code.gs` from this repository.
3. Save the project as **Tomhel Website Forms**.

## 3. Configure Script Properties

In Apps Script: **Project Settings → Script Properties → Add script property**

| Property | Value |
|----------|--------|
| `SPREADSHEET_ID` | Your spreadsheet ID |
| `HEADMASTER_EMAIL` | `tomhelschool@yahoo.com` (or preferred inbox) |
| `API_SECRET` | A long random string (recommended) |

Run **`setupSheets`** once from the editor (Run ▶) to write column headers and freeze row 1.

Authorize the script when prompted (Sheets + Gmail scopes).

## 4. Deploy as Web App

1. **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy and copy the **Web app URL**

Each code change requires **Deploy → Manage deployments → Edit → New version → Deploy**.

## 5. Configure the Next.js Website

Add to `.env.local` (and Vercel **Environment Variables**):

```env
GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GAS_API_SECRET=your-long-random-secret
```

`GAS_API_SECRET` must match the `API_SECRET` script property. If omitted on both sides, the API runs without auth (not recommended for production).

Restart the dev server after changing env vars.

## 6. Test Endpoints

Health check (browser):

```
GET https://script.google.com/macros/s/YOUR_ID/exec
```

Expected: `{"success":true,"message":"Tomhel Forms API is running."}`

Form tests (via website):

- `/admissions` — Submit Application
- `/contact` — Send a Message / Schedule a Visit tabs

Verify rows appear in Sheets and both headmaster and submitter receive emails.

## 7. Security Recommendations

1. **Always use `API_SECRET`** — shared only between Vercel and Apps Script.
2. **Never expose `GAS_WEB_APP_URL` in client code** — the Next.js API routes proxy all requests server-side.
3. **Honeypot fields** on forms reject basic bots (handled in API routes).
4. **Deploy GAS with "Anyone"** access only because the secret validates requests; without a secret, anyone who discovers the URL could POST.
5. **Limit Gmail send quota** — standard Google accounts allow ~100 emails/day; Workspace accounts have higher limits.
6. **Review Sheet access** — restrict spreadsheet sharing to school administration only.
7. **Rotate `API_SECRET`** if leaked; update both Script Properties and Vercel.
8. **Optional:** add Google reCAPTCHA v3 and validate in Apps Script for additional bot protection.

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| "Spreadsheet is not configured" | Set `SPREADSHEET_ID` in Script Properties |
| "Unauthorized" | Match `GAS_API_SECRET` and `API_SECRET` |
| "Sheet not found" | Tab names must be exact: Admissions, Messages, VisitRequests |
| Emails not sent | Re-authorize script; check Gmail daily quota |
| Forms return 503 on site | Set `GAS_WEB_APP_URL` in Vercel / `.env.local` |
| Changes not applied | Create a **new deployment version** in Apps Script |

## Sheet Column Reference

**Admissions:** Timestamp, Application ID, Student Name, DOB, Gender, Class, Parent Name, Phone, Email, Address, Previous School, Notes

**Messages:** Timestamp, Name, Email, Phone, Subject, Message

**VisitRequests:** Timestamp, Name, Email, Phone, Visit Date, Visitors Count, Message
