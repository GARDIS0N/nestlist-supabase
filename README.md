# NestList

Kenyan rental marketplace connecting landlords, tenants, caretakers and agents.
Operated by Nestlist Rental Platforms Limited (nestlist.co.ke).

> **Status: pre-production prototype.** Core flows are implemented, but there is
> no automated test suite and several security items are open (see "Known gaps").

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, React Router 7, Tailwind CSS 4 |
| API server | Node + Express (`server.ts`, ~3,700 lines), run with `tsx` |
| Database / auth | Supabase (Postgres, Row Level Security, Google OAuth) |
| Edge functions | `supabase/functions`: `mpesa-stk-push`, `mpesa-callback`, `redeem-lead-credit`, `send-sms` |
| Payments | Safaricom M-Pesa Daraja STK Push, plus manual Paybill confirmation reviewed by an admin |
| SMS / email | Africa's Talking, Nodemailer |
| Hosting | Vercel (`vercel.json`) |

Data model (`supabase/migrations`, 17 files): `profiles`, `properties`,
`inquiries`, `messages`, `saved_properties`, `search_alerts`, `listing_payments`,
`listing_boosts`, `lead_unlocks`, `credit_transactions`, `sms_logs`, `universities`.

## Features

- Role-based accounts: tenant, landlord, caretaker, agent, admin
- Property listing, browsing, search, saved properties, search alerts
- Pay-per-inquiry lead gating: landlord contact details stay hidden until a lead is unlocked with credits
- Listing fees and paid listing boosts via M-Pesa (STK Push or manual Paybill)
- Admin console: payment verification, listing and user suspension, stats
- Nearby universities and estates, listing expiry and warnings, "Drive" export (`src/lib/drive.ts`)

## Design decisions

- **Lead gating enforced in the database.** RLS policies and migrations (`20260727…`, `20260806…`, `20260822…`) hide contact data until an unlock exists, so gating does not rely on the UI.
- **Credit ledger.** Every credit change is a row in `credit_transactions`; `scripts/reconcile-credits.ts` and `supabase/reconciliation_check.sql` verify balances against it.
- **Manual payment fallback.** Because STK Push can fail or be unavailable, users may pay a Paybill manually and an admin verifies the M-Pesa code.
- **Mock mode.** The server runs against a local mock DB when Supabase is not configured.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in real values; never commit this file
npm run dev
```

Setup guides: `SUPABASE_SETUP.md`, `MPESA_SETUP.md`, `PRODUCTION_CHECKLIST.md`.

## Testing

No automated tests exist. `npm run lint` checks route wiring and runs `tsc --noEmit`.

## Implementation status

TODO: confirm each item against the live deployment before sharing this file.

- Implemented in code: auth, listings, inquiries, lead unlock, boosts, admin console, M-Pesa STK flow, manual payments
- Not verified in production: live M-Pesa go-live, SMS delivery, email domain setup

## Security notes

- All credentials are read from environment variables; see `.env.example`. Never commit `.env*` files.
- M-Pesa callbacks require a shared secret (`CALLBACK_SECRET` / `MPESA_CALLBACK_SECRET`) and are ignored without it.
- The unauthenticated `/api/codebase/bundle` endpoint was removed.
- Open item: some write endpoints in the legacy Express server (`server.ts`, dev-only wrapper) take user IDs from the request body; production traffic goes through Supabase RLS and edge functions.
- No automated tests.

## Provenance

Built by Gardison Kirui. Parts of the codebase were produced or modified with
Google AI Studio and other AI tools (the repo history includes an "AI Studio latest
export" commit). Third-party dependencies are listed in `package.json` under their own licences.
