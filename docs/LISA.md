# LISA, the website's assistant

LISA is the "Ask LISA" chat button on every public page of the website (not in the portal). It answers visitors'
questions about the school and the website: admissions, academics, contact details and office hours, news and
upcoming dates, and how Pay Fees, Donate and the Academic Prep portal work.

## What LISA knows, and what it can't do

- Its knowledge is built from the website's own text (`src/lib/constants.ts`, the same values the pages show), the
  list of pages, how the services work (`src/lib/lisa/knowledge.ts`), and the latest news, dates and open donation
  projects. When the website's text changes, LISA's answers follow; nothing to retrain.
- It has **no access** to student, parent, fee, payment or portal records, and can't change anything. It sends
  people to the right page or the school office, never asks for passwords or PINs, and doesn't promise admission or
  discounts. When it doesn't know, it says so and gives the school's phone, email and office hours.
- Conversations are not stored by the website: they stay in the visitor's browser tab. They are sent to Anthropic
  to answer (Anthropic doesn't use API data to train its models).

## Turning LISA on

1. Create an account at [console.anthropic.com](https://console.anthropic.com), add a payment method and some credit
   (Settings → Billing), and set a **monthly spend limit** (Settings → Limits) so the bill can never surprise you.
2. **Settings → API Keys → Create Key**. Copy it (`sk-ant-...`).
3. Add it to `.env.local` and to Vercel (Settings → Environment Variables, Production), then deploy:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
   The button appears on the next deploy. Remove the key to switch LISA off.

## Cost

LISA uses Claude Opus 5.5 at low effort. The school information (about 5,000 tokens) is cached, so each question
after the first in a 5-minute window sends it at a tenth of the price. A typical question costs roughly **US$0.01 to
0.02** (about 1,000 questions ≈ US$15). The first question after a quiet spell costs a little more (writing the
cache). For a much cheaper LISA, the model can be changed to Claude Haiku 5.5 in `src/lib/lisa/lisa.ts`
(`LISA_MODEL`), at some cost in answer quality.

Limits that keep the cost in check (`src/lib/lisa/limits.ts`): 20 questions per visitor per 10 minutes, a daily total
(`LISA_DAILY_LIMIT`, default 3,000), questions up to 1,000 characters, and only the last 12 turns of a conversation
are sent. The Anthropic spend limit is the hard ceiling.

If a request is declined by Anthropic's safety checks, the server-side fallback lets another Claude model answer
(`fallbacks: "default"`); if every model declines, LISA politely points to the school office.
