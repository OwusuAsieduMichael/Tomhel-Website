import type { Metadata } from "next";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { formatCedis } from "@/lib/payments/money";
import { campaignsWithTotals } from "@/lib/payments/payments";
import { paystackConfigured, paystackTestMode } from "@/lib/payments/paystack";
import { getStore } from "@/lib/prep/store";
import { createPageMetadata } from "@/lib/seo";
import { PaymentsOffNotice, TestModeNotice } from "../pay/payer-fields";
import { DonateForm } from "./donate-form";

export const metadata: Metadata = createPageMetadata({
  title: "Donate",
  description: "Support Tomhel Preparatory School's projects and fundraising with a donation by mobile money or card.",
  path: "/donate",
});

export const dynamic = "force-dynamic";

async function load() {
  try {
    return await campaignsWithTotals(getStore());
  } catch (e) {
    console.error("Donate: projects unavailable", e instanceof Error ? e.message : e);
    return { campaigns: [], general: { raised: 0, donors: 0 } };
  }
}

export default async function DonatePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const enabled = paystackConfigured();
  const { campaigns } = await load();
  const open = campaigns.filter((c) => c.status === "open");
  const wanted = (await searchParams).project;
  const preselect = open.find((c) => c.slug === wanted)?.id ?? open[0]?.id ?? null;

  return (
    <>
      <PageHero eyebrow="Donate" title="Support Tomhel" description="Every gift helps our pupils learn and grow. Give to a project below, or to wherever it is needed most." />
      <BelowHeroShell>
        <Section>
          <Container className="max-w-3xl space-y-8">
            {!enabled ? <PaymentsOffNotice /> : paystackTestMode() ? <TestModeNotice /> : null}
            {open.length ? (
              <ul className="grid gap-4">
                {open.map((c) => {
                  const pct = c.goal ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : null;
                  return (
                    <li key={c.id} className="surface-card space-y-3 p-6">
                      <h2 className="text-lg font-semibold text-primary">{c.title}</h2>
                      {c.description ? <p className="whitespace-pre-line text-sm text-deep">{c.description}</p> : null}
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold">{formatCedis(c.raised)}</span> raised
                          {c.goal ? ` of ${formatCedis(c.goal)}` : ""} · {c.donors} {c.donors === 1 ? "gift" : "gifts"}
                        </p>
                        {pct !== null ? (
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10" role="progressbar" aria-label={`${c.title}: raised so far`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <DonateForm projects={open.map((c) => ({ id: c.id, title: c.title }))} preselect={preselect} enabled={enabled} />
          </Container>
        </Section>
      </BelowHeroShell>
    </>
  );
}
