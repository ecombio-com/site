# Custom customer auth for Shopify headless (Next.js App Router)

Email one-time-code login. You own the UI and session; Shopify is the source of
truth for customers and orders (via the Admin API, server-side only).

## Install

    npm i jose @upstash/redis @upstash/ratelimit resend server-only

Requires Next.js 15+ (async `cookies()` / `headers()` / `searchParams`) and an
`@/` import alias pointing at your project root (adjust imports if you use `src/`).
Copy the `lib/` and `app/` folders into your project and `.env.example` values into
`.env.local` (and Vercel project settings).

## Shopify setup

1. Create an app in the **Dev Dashboard** (legacy custom apps can't be created anymore).
2. Version -> Admin API scopes: `read_customers`, `write_customers`, `read_orders`
   (add `read_all_orders` if you need orders older than 60 days).
3. Request **protected customer data** access for the app (needed for email/name).
4. Release the version, install on your store, copy Client ID + Secret into env.
   Tokens last 24h; `lib/shopify/admin.ts` refreshes and caches them in Redis.

## Other services

- **Upstash Redis**: add via Vercel Marketplace (sets `KV_REST_API_*`).
- **Resend**: verify your sending domain, set `RESEND_API_KEY` and `AUTH_EMAIL_FROM`.

## How it works

1. `/login` -> `requestLoginCode(email)`: rate-limited, stores an HMAC of a 6-digit code (10 min TTL), emails it.
2. `verifyLoginCode(email, code)`: rate-limited, max 5 attempts per code, single-use, constant-time compare.
3. On success: find-or-create the Shopify customer by verified email, set a signed httpOnly JWT cookie (30 days) containing the customer GID.
4. Protected pages call `requireSession()`. Always use `session.customerId` for Shopify lookups, never an ID from the request.

## Not included (yet)

- Passing the logged-in email into the cart so checkout is prefilled (`cartBuyerIdentityUpdate`).
- Server-side session revocation (logout only clears the cookie; add a Redis session ID or per-user token version if you need "sign out everywhere").
- Address book / profile editing (add Admin API mutations scoped to `session.customerId`).

## Notes

- Untested scaffold: install, type-check, and try the full flow on a dev store before shipping.
- Codes are 6 digits, so keep the rate limits in `lib/auth/actions.ts` in place.
- Set `SHOPIFY_ADMIN_API_VERSION` to a version your app supports (e.g. the latest stable).
