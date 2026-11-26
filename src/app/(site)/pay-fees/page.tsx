import type { Metadata } from "next";
import { BelowHeroShell } from "@/components/layout/below-hero-shell";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { paystackConfigured, paystackTestMode } from "@/lib/payments/paystack";
import { createPageMetadata } from "@/lib/seo";
import { PaymentsOffNotice, TestModeNotice } from "../pay/payer-fields";
import { PayFeesForm } from "./pay-fees-form";

export const metadata: Metadata = createPageMetadata({
  title: "Pay School Fees",
  description: "Pay Tomhel Preparatory School fees online with mobile money or card.",
  path: "/pay-fees",
});

export const dynamic = "force-dynamic";

export default function PayFeesPage() {
  const enabled = paystackConfigured();
  return (
    <>
      <PageHero eyebrow="Pay Fees" title="Pay school fees online" description="With MTN MoMo, Telecel Cash, AirtelTigo Money or a bank card. You get a receipt straight away." />
      <BelowHeroShell>
        <Section>
          <Container className="max-w-3xl space-y-6">
            {!enabled ? <PaymentsOffNotice /> : paystackTestMode() ? <TestModeNotice /> : null}
            <PayFeesForm enabled={enabled} />
          </Container>
        </Section>
      </BelowHeroShell>
    </>
  );
}
