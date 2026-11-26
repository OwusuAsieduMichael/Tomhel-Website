import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it } from "vitest";
import { dynamicKnowledge, staticKnowledge } from "@/lib/lisa/knowledge";
import { dailyLimit, PER_VISITOR, resetLimits, takeQuestion, WINDOW_MS } from "@/lib/lisa/limits";
import { lisaAnswer, lisaSystem, MAX_TURNS, trimConversation } from "@/lib/lisa/lisa";

afterEach(() => resetLimits());

describe("LISA's knowledge", () => {
  it("has the school's facts and pages, without pictures, videos or web addresses", () => {
    const k = staticKnowledge();
    expect(k).toContain("Effiduasi");
    expect(k).toContain("Monday to Friday");
    expect(k).toContain("/pay-fees");
    expect(k).toContain("/prep/login");
    expect(k).not.toMatch(/https?:\/\/|\.(jpe?g|png|webp|mp4)\b/i);
  });

  it("adds news, dates and projects, after the cached school information", () => {
    const sys = lisaSystem({
      news: [{ title: "Speech Day", excerpt: "Parents are invited.", category: "Events", publishedAt: "2026-11-01T00:00:00Z", slug: "speech-day", eventStart: "2026-12-04T00:00:00Z" }],
      projects: [{ title: "New school bus", description: "For trips." }],
    });
    expect(sys).toHaveLength(2);
    expect(sys[0].cache_control).toEqual({ type: "ephemeral" });
    expect(sys[0].text).toContain("You are LISA");
    expect(sys[1].cache_control).toBeUndefined();
    expect(sys[1].text).toContain("Speech Day (date: 4 December 2026)");
    expect(sys[1].text).toContain("New school bus");
    expect(dynamicKnowledge({ news: [], projects: [] }, new Date())).toContain("No news posted yet.");
  });
});

describe("conversations", () => {
  it("send only the latest turns, starting with the visitor and ending with their question", () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `m${i}` }));
    long.push({ role: "user", content: "last" });
    const t = trimConversation(long)!;
    expect(t.length).toBeLessThanOrEqual(MAX_TURNS);
    expect(t[0].role).toBe("user");
    expect(t.at(-1)).toEqual({ role: "user", content: "last" });
  });

  it("refuse a question that is too long, or a turn that isn't the visitor's", () => {
    expect(trimConversation([{ role: "user", content: "x".repeat(1001) }])).toBeNull();
    expect(trimConversation([{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }])).toBeNull();
  });
});

describe("limits", () => {
  it("allow a visitor a number of questions per window, then again after it", () => {
    const t0 = Date.UTC(2026, 10, 26, 9);
    for (let i = 0; i < PER_VISITOR; i++) expect(takeQuestion("1.2.3.4", t0 + i)).toBeNull();
    expect(takeQuestion("1.2.3.4", t0 + 100)).toBe("visitor");
    expect(takeQuestion("5.6.7.8", t0 + 100)).toBeNull();
    expect(takeQuestion("1.2.3.4", t0 + WINDOW_MS + 1)).toBeNull();
  });

  it("stop for the day at the daily total", () => {
    const t0 = Date.UTC(2026, 10, 26, 9);
    for (let i = 0; i < dailyLimit(); i++) takeQuestion(`v${i}`, t0);
    expect(takeQuestion("someone-new", t0)).toBe("daily");
    expect(takeQuestion("someone-new", t0 + 86_400_000)).toBeNull();
  });
});

/** A stand-in for the Claude client: streams the given text, then reports the stop reason. */
function fakeClient(text: string, stopReason: string) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: Record<string, unknown>) {
          calls.push(params);
          const events = text ? [{ type: "content_block_delta", delta: { type: "text_delta", text } }] : [];
          return {
            async *[Symbol.asyncIterator]() {
              yield* events;
            },
            finalMessage: async () => ({ stop_reason: stopReason }),
          };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

const collect = async (gen: AsyncGenerator<string>) => {
  let s = "";
  for await (const piece of gen) s += piece;
  return s;
};

describe("answers", () => {
  const d = { news: [], projects: [] };
  const q = [{ role: "user" as const, content: "When is the office open?" }];

  it("stream the text, on Claude Opus 5.5 at low effort with the server-side fallback", async () => {
    const { client, calls } = fakeClient("Monday to Friday, 7:30 AM to 4:30 PM.", "end_turn");
    expect(await collect(lisaAnswer(client, d, q))).toBe("Monday to Friday, 7:30 AM to 4:30 PM.");
    expect(calls[0]).toMatchObject({ model: "claude-opus-5-5", output_config: { effort: "low" }, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
  });

  it("say something kind when every model declines", async () => {
    const { client } = fakeClient("", "refusal");
    expect(await collect(lisaAnswer(client, d, q))).toMatch(/can't help with that/);
  });
});
