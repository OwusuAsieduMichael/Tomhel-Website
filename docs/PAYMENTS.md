# School fees and donations (Paystack)

Parents pay school fees, and anyone can donate, on the public website: **Pay Fees** (`/pay-fees`) and **Donate**
(`/donate`), linked from the footer. Payments go through [Paystack](https://paystack.com): MTN MoMo, Telecel Cash,
AirtelTigo Money and cards. Admins manage everything in the portal: **Admin → Payments**.

## How it works

- **Fees:** the admin sets each class's fee per term (Admin → Payments → School fees). A parent enters the Student
  ID, sees the child's first name and class, each term's fee, what is paid and the balance, and pays all or part.
- **Donations:** to a project (Admin → Payments → Donation projects, with an optional goal and a progress bar) or to
  the general fund. Givers can keep their name private.
- **Safety:** a payment is recorded as "not confirmed" before the payer goes to Paystack, and only counts once
  Paystack's own records confirm the same reference, amount and currency. That check runs when the payer comes back
  (`/pay/return`) and again when Paystack's signed notification arrives (`/api/paystack/webhook`). The website never
  sees card or mobile money details. Amounts are kept in pesewas.
- **Receipts:** `/pay/receipt/<reference>` (printable). Paystack also emails one when an email is given.
- **For the bursar:** Admin → Payments shows every payment, who has paid what per class and term, and downloads a CSV.

## Setting it up

1. Create an account at [dashboard.paystack.com](https://dashboard.paystack.com/#/signup) (country: Ghana). It starts
   in **test mode**, so you can try everything before the business is approved.
2. **Settings → API Keys & Webhooks**: copy the **Test Secret Key** (`sk_test_...`).
3. Add it to `.env.local` and to Vercel (Settings → Environment Variables, Production), then deploy:
   ```
   PAYSTACK_SECRET_KEY=sk_test_...
   PAYSTACK_RECEIPT_EMAIL=accounts@your-school-domain   # receipts for payers without an email
   ```
4. Same page, **Test Webhook URL**: `https://<your site>/api/paystack/webhook`.
5. Try it: set a fee (Admin → Payments → School fees), pay it on `/pay-fees` with Paystack's
   [test card or test mobile money number](https://paystack.com/docs/payments/test-payments/), and check the receipt
   and Admin → Payments.

## Going live (real money)

1. In Paystack, complete **Activate business** (business registration documents, bank or mobile money account for
   settlements). Paystack reviews it.
2. Replace the key with the **Live Secret Key** (`sk_live_...`) in Vercel and redeploy.
3. Set the **Live Webhook URL** to the same address.
4. Make one small real payment (e.g. GH₵ 1) and check it arrives.

Never put the secret key in the code or share it: anyone with it can see and refund the school's payments.
