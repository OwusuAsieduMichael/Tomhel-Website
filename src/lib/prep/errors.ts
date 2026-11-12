/**
 * Plain messages for failures that aren't the user's fault: the Google Sheet missing a tab or column (setup
 * hasn't been run after an update), or Google being briefly unavailable. Actions show these on the form instead
 * of the generic error page. Returns null for anything else, which is a bug and should still surface.
 */
export function sheetProblemMessage(e: unknown): string | null {
  const message = e instanceof Error ? e.message : String(e ?? "");
  if (/has no column|is missing the column|Sheet ".*" not found|Unknown table/i.test(message)) {
    return "This couldn't be saved because the data sheet needs updating. Ask the admin to run npm run prep:setup, then try again.";
  }
  if (/unreadable response|data service failed|Service Spreadsheets|timed out|Lock timeout|ECONNRESET|fetch failed/i.test(message)) {
    return "Google Sheets didn't respond just now. Please try again in a moment.";
  }
  return null;
}
