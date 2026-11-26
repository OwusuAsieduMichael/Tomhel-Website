import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { takeQuestion } from "@/lib/lisa/limits";
import { chatSchema, lisaAnswer, lisaConfigured, MAX_MESSAGE_CHARS, trimConversation } from "@/lib/lisa/lisa";
import type { DynamicKnowledge } from "@/lib/lisa/knowledge";
import { getNewsArticles } from "@/lib/sanity";

export const runtime = "nodejs";

const say = (text: string, status: number) => new NextResponse(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** The news, dates and projects LISA can mention. If they can't be read, LISA still answers from the rest. */
async function dynamic(): Promise<DynamicKnowledge> {
  const [news, projects] = await Promise.all([
    getNewsArticles().catch(() => []),
    import("@/lib/payments/payments")
      .then(async ({ campaignsWithTotals }) => {
        const { getStore } = await import("@/lib/prep/store");
        return (await campaignsWithTotals(getStore())).campaigns.filter((c) => c.status === "open").map((c) => ({ title: c.title, description: c.description }));
      })
      .catch(() => []),
  ]);
  return { news, projects };
}

/** POST { messages: [{ role, content }] } -> LISA's answer, streamed as plain text. */
export async function POST(req: NextRequest) {
  if (!lisaConfigured()) return say("LISA isn't switched on yet.", 503);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return say("That message couldn't be read.", 400);
  }
  const parsed = chatSchema.safeParse(body);
  const messages = parsed.success ? trimConversation(parsed.data.messages) : null;
  if (!messages) return say(`Please keep your question under ${MAX_MESSAGE_CHARS} characters.`, 400);

  const visitor = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const limited = takeQuestion(visitor);
  if (limited === "visitor") return say("You've asked a lot of questions in a short time. Please wait a few minutes and try again.", 429);
  if (limited === "daily") return say("LISA is resting for today. Please call the school office on 024 424 2394, or use the Contact page.", 429);

  const client = new Anthropic();
  const d = await dynamic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const piece of lisaAnswer(client, d, messages)) controller.enqueue(encoder.encode(piece));
      } catch (e) {
        console.error("LISA:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        controller.enqueue(encoder.encode("\n\nSorry, I couldn't answer just now. Please try again in a moment, or call the school office on 024 424 2394."));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
