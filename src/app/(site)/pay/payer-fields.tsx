import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Name, phone and (optional) email of the person paying. */
export function PayerFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="payerName">Your name</Label>
        <Input id="payerName" name="payerName" autoComplete="name" required maxLength={120} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="payerPhone">Phone number</Label>
        <Input id="payerPhone" name="payerPhone" type="tel" autoComplete="tel" placeholder="024 123 4567" inputMode="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="payerEmail">
          Email <span className="font-normal text-deep">(optional, for your receipt)</span>
        </Label>
        <Input id="payerEmail" name="payerEmail" type="email" autoComplete="email" />
      </div>
    </div>
  );
}

export function PaymentsOffNotice() {
  return (
    <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Online payment is being set up and isn&apos;t open yet. Please pay at the school office for now.
    </p>
  );
}

export function TestModeNotice() {
  return (
    <p role="status" className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      Test mode: no real money is taken. Use Paystack&apos;s test card or test mobile money number.
    </p>
  );
}
