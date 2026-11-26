import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classOf,
  DEFAULT_GRADUATION_MESSAGE,
  finalYearClasses,
  graduateClass,
  GraduationError,
  graduationOf,
  undoGraduation,
} from "@/lib/prep/graduation";
import { NewsError, saveNewsPost, slugify } from "@/lib/prep/news";
import { insert, newId, setStoreForTesting, type Store } from "@/lib/prep/store";
import { getNewsArticle, getNewsArticles, getUpcomingDates } from "@/lib/sanity";
import { fallbackNews } from "@/lib/constants";
import { createRoutedTestStore } from "../helpers/store";

// The first test starts an in-memory Postgres, which can take a while on a busy machine.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

let store: Store;
const JHS3 = newId();
const JHS2 = newId();

function student(loginId: string, classId: string) {
  return { id: newId(), loginId, name: `Student ${loginId}`, role: "student" as const, classId, passwordHash: "x", active: true, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null, lastLoginAt: null, sessionVersion: 1, createdAt: new Date() };
}

beforeEach(async () => {
  store = await createRoutedTestStore();
  await store.write([
    insert("classes", [
      { id: JHS3, name: "JHS 3A", yearGroup: 3, academicYear: "2025/2026", createdAt: new Date() },
      { id: JHS2, name: "JHS 2A", yearGroup: 2, academicYear: "2025/2026", createdAt: new Date() },
    ]),
    insert("users", [student("TMH1", JHS3), student("TMH2", JHS3), student("TMH3", JHS2)]),
  ]);
});
afterEach(() => setStoreForTesting(undefined));

const idOf = async (loginId: string) => (await store.read("users")).users.find((u) => u.loginId === loginId)!.id;

describe("graduation", () => {
  it("graduates the final-year class; the message shows from the graduation date", async () => {
    expect((await finalYearClasses(store)).map((c) => c.name)).toEqual(["JHS 3A"]);
    const on = new Date("2026-07-31T00:00:00Z");
    expect(await graduateClass(store, "admin", JHS3, { graduatedOn: on, message: "" })).toEqual({ added: 2 });

    const tmh1 = await idOf("TMH1");
    expect(await graduationOf(store, tmh1, new Date("2026-07-30T12:00:00Z"))).toBeNull();
    const g = await graduationOf(store, tmh1, new Date("2026-08-01T00:00:00Z"));
    expect(g).toMatchObject({ className: "JHS 3A", academicYear: "2025/2026", message: DEFAULT_GRADUATION_MESSAGE });
    expect(classOf(g!.academicYear)).toBe("Class of 2026");
    expect(await graduationOf(store, await idOf("TMH3"), new Date("2027-01-01"))).toBeNull();

    const [c] = await finalYearClasses(store);
    expect(c).toMatchObject({ students: 2, graduated: 2 });
  });

  it("doesn't graduate anyone twice, and can be undone", async () => {
    const on = new Date("2026-07-31T00:00:00Z");
    await graduateClass(store, "admin", JHS3, { graduatedOn: on, message: "Well done!" });
    await expect(graduateClass(store, "admin", JHS3, { graduatedOn: on, message: "" })).rejects.toBeInstanceOf(GraduationError);
    expect(await undoGraduation(store, JHS3)).toEqual({ removed: 2 });
    expect(await graduationOf(store, await idOf("TMH1"), new Date("2027-01-01"))).toBeNull();
  });
});

describe("website news", () => {
  const post = (title: string, o: Partial<{ publish: boolean; eventStart: string; eventEnd: string; category: "Events" | "Announcements" }> = {}) =>
    saveNewsPost(store, "admin", {
      title,
      category: o.category ?? "Events",
      excerpt: "Parents and students are invited.",
      body: "First paragraph.\n\nSecond paragraph.",
      eventStart: o.eventStart ?? "",
      eventEnd: o.eventEnd ?? "",
      publish: o.publish ?? true,
    });

  it("makes a readable, unique address from the title", async () => {
    expect(slugify("Sports Day 2026: Mon–Fri!")).toBe("sports-day-2026-mon-fri");
    expect((await post("Speech Day")).slug).toBe("speech-day");
    expect((await post("Speech Day")).slug).toBe("speech-day-2");
  });

  it("checks the post", async () => {
    await expect(post("Hi")).rejects.toBeInstanceOf(NewsError);
    await expect(post("Vacation", { eventStart: "2026-12-20", eventEnd: "2026-12-10" })).rejects.toThrow(/end date/);
  });

  it("shows published posts first on the website, then the school's earlier articles; drafts stay hidden", async () => {
    setStoreForTesting(store);
    await post("Graduation 2026", { eventStart: "2026-07-31" });
    await post("Draft notice", { publish: false, category: "Announcements" });
    const articles = await getNewsArticles();
    expect(articles[0]).toMatchObject({ title: "Graduation 2026", category: "Events", body: ["First paragraph.", "Second paragraph."] });
    expect(articles.some((a) => a.title === "Draft notice")).toBe(false);
    expect(articles.slice(1).map((a) => a._id)).toEqual(fallbackNews.map((a) => a._id));
    expect((await getNewsArticle("graduation-2026"))?.eventStart).toBe("2026-07-31T00:00:00.000Z");
  });

  it("lists dates that aren't over yet, soonest first", async () => {
    setStoreForTesting(store);
    await post("Past sports day", { eventStart: "2026-03-01" });
    await post("Vacation", { eventStart: "2026-12-18", eventEnd: "2027-01-05" });
    await post("Graduation", { eventStart: "2026-12-05" });
    const dates = await getUpcomingDates(new Date("2026-12-10T09:00:00Z"));
    // Graduation (5 Dec) is over; the vacation runs until 5 Jan, so it is still upcoming.
    expect(dates.map((d) => d.title)).toEqual(["Vacation"]);
    expect((await getUpcomingDates(new Date("2026-11-01"))).map((d) => d.title)).toEqual(["Graduation", "Vacation"]);
  });

  it("still shows the school's articles if the portal's data can't be read", async () => {
    setStoreForTesting({ read: () => Promise.reject(new Error("offline")) } as unknown as Store);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await getNewsArticles()).map((a) => a._id)).toEqual(fallbackNews.map((a) => a._id));
  });
});
