/** Shared by the server pages and the (client) news cards: no server-only imports here. */

const parts = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return { weekday: p.weekday, day: p.day, month: p.month, year: p.year };
};

/** "Fri 18 Dec 2026", or "Fri 18 Dec – Wed 6 Jan 2027" for a range (the year once, when it is the same). */
export function formatEventDates(start: string, end?: string): string {
  const a = parts(start);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return `${a.weekday} ${a.day} ${a.month} ${a.year}`;
  const b = parts(end);
  const first = a.year === b.year ? `${a.weekday} ${a.day} ${a.month}` : `${a.weekday} ${a.day} ${a.month} ${a.year}`;
  return `${first} – ${b.weekday} ${b.day} ${b.month} ${b.year}`;
}
