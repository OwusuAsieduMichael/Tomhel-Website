"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["How do I apply for admission?", "What are the office hours?", "How do I pay school fees?", "Where is the school?"];
const GREETING = "Hello! I'm LISA, Tomhel's assistant. Ask me about admissions, academics, fees, events or anything on this website.";

/** A small, safe Markdown subset for LISA's answers: paragraphs, "- " lists, **bold**, and links to site pages, email or phone. */
function Rich({ text }: { text: string }) {
  const inline = (s: string, key: string) => {
    const out: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      if (m[3]) out.push(<strong key={`${key}-${m.index}`}>{m[3]}</strong>);
      else {
        const href = m[2];
        const internal = /^\/[A-Za-z0-9/_-]*$/.test(href);
        const contact = /^(mailto:[^\s]+|tel:\+?[0-9 ]+)$/.test(href);
        if (internal) out.push(<Link key={`${key}-${m.index}`} href={href} className="font-semibold text-primary underline">{m[1]}</Link>);
        else if (contact) out.push(<a key={`${key}-${m.index}`} href={href} className="font-semibold text-primary underline">{m[1]}</a>);
        else out.push(m[1]); // other links are shown as plain text
      }
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="ml-4 list-disc space-y-0.5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j ? <br /> : null}
                {inline(l, `${i}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** "Ask LISA": a chat button in the corner of every public page. The conversation stays in this browser tab. */
export function LisaWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/lisa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      if (!res.ok || !res.body) {
        const why = await res.text().catch(() => "");
        setMessages([...history, { role: "assistant", content: why || "Sorry, I couldn't answer just now. Please try again." }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: text }]);
      }
    } catch {
      setMessages([...history, { role: "assistant", content: "I couldn't reach the server. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3.5 font-semibold text-white shadow-lg shadow-black/20 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary print:hidden"
        >
          <MessageCircle className="size-5" aria-hidden /> Ask LISA
        </button>
      ) : (
        <section
          role="dialog"
          aria-label="Chat with LISA, Tomhel's assistant"
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px] print:hidden"
        >
          <header className="flex items-center gap-3 bg-primary px-4 py-3 text-white">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/15 font-bold" aria-hidden>
              L
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold leading-tight">LISA</h2>
              <p className="text-xs text-white/80">Tomhel&apos;s website assistant</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-2 hover:bg-white/15">
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed" aria-live="polite">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-black/5 px-3.5 py-2.5 text-deep">{GREETING}</div>
            {messages.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5">
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5",
                  m.role === "user" ? "ml-auto rounded-tr-sm bg-primary text-white" : "rounded-tl-sm bg-black/5 text-deep",
                )}
              >
                {m.role === "assistant" ? (
                  m.content ? <Rich text={m.content} /> : <span className="animate-pulse">LISA is typing…</span>
                ) : (
                  <p className="whitespace-pre-line">{m.content}</p>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
            className="flex items-end gap-2 border-t border-black/10 p-3"
          >
            <label htmlFor="lisa-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="lisa-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Ask LISA a question…"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-black/15 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send" className="flex size-11 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-50">
              <Send className="size-4" aria-hidden />
            </button>
          </form>
          <p className="px-3 pb-2 text-center text-[11px] text-deep/70">LISA is an AI assistant and can make mistakes. Please don&apos;t share passwords or PINs.</p>
        </section>
      )}
    </>
  );
}
