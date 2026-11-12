/** Display formats for /prep. Always school time (Ghana), whatever the server's or browser's clock says. */

const tz = "Africa/Accra";

const dayTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz });
const timeOnly = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz });
const dayOnly = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });

/** "Wed 12 Nov, 6:00 pm" */
export const formatDayTime = (d: Date) => dayTime.format(d);

/** "6:00 pm" */
export const formatTime = (d: Date) => timeOnly.format(d);

export const sameSchoolDay = (a: Date, b: Date) => dayOnly.format(a) === dayOnly.format(b);

/** "2 days 10 hours", "45 min" */
export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (days) return hours ? `${plural(days, "day")} ${plural(hours, "hour")}` : plural(days, "day");
  if (hours) return mins ? `${plural(hours, "hour")} ${mins} min` : plural(hours, "hour");
  return `${mins} min`;
}

/** "3 hours ago", "2 days ago" */
export function formatAgo(d: Date, now = new Date()) {
  const ms = now.getTime() - d.getTime();
  if (ms < 60_000) return "just now";
  return `${formatDuration(ms).split(" ").slice(0, 2).join(" ")} ago`;
}

/** Marks with at most one decimal: 8, 7.5 */
export const fmtMarks = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
