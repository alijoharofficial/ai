# TECH24 Security Audit Report

Date: 2026-09-23
Scope: the TECH24 marketing/admin product only (`services.html`, `packages.html`,
`policy.html`, `admin-login.html`, `admin.html`, `admin-services.html`,
`vercel.json`, `package.json`, and everything under `api/`). The unrelated
"Ali Johar" blog pages that live in the same repo/branch (`index.html`,
`blogs.html`, `post.html`, `create-post.html`, `all-blogs.html`, `login.html`,
`api/publish.js`, `data/posts.json`) are a separate product and were left
untouched.

## Stack summary

Static HTML/CSS/vanilla-JS site, no framework, no bundler, no build step.
Deployed to Vercel as a zero-config static site, with two Node.js serverless
functions under `/api` (`admin-invoices.js`, `admin-services.js`) that call
the Stripe API. No database — all invoice/service state lives in Stripe
itself (Payment Link metadata, Products, Prices). Authentication is a single
shared admin secret compared against `x-admin-key` on every API call; the
only dependency is `stripe` (npm), pinned via `package-lock.json`.

## Issues found and fixed

| # | Severity | Category | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | Medium | Security headers | No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy were set anywhere. | Added a global `headers` block in `vercel.json` applying all of these to every route. |
| 2 | Medium | CORS | `api/_lib/auth.js` sent `Access-Control-Allow-Origin: *` on both admin API endpoints, allowing any site to read responses if it ever obtained a valid key. | Reflects only `https://www.tech24.cc` or `*.vercel.app` preview origins now, with `Vary: Origin`. |
| 3 | Low | Auth | The admin key was compared with `!==`, a non-constant-time comparison that can leak timing information about the secret. | Switched to `crypto.timingSafeEqual`. |
| 4 | Low | Auth / brute force | No throttling on invalid `x-admin-key` attempts. | Added a best-effort in-memory rate limit (20 attempts/IP/minute) in `checkAdmin`. This is a deterrent only — it resets on cold start and isn't shared across concurrent serverless instances. For real protection, enable Vercel's Attack Challenge Mode or front the site with a WAF (see "Manual action items"). |
| 5 | Low | Input validation | `api/admin-invoices.js` and `api/admin-services.js` accepted currency, email, and numeric fields with no server-side validation beyond "is it present" — a caller who bypassed the UI could submit an unsupported currency, a malformed email, negative/absurd quantities or rates, or hundreds of line items. | Added a currency whitelist matching the UI's supported currencies (USD/GBP/EUR/AED/PKR/MYR), an email-format check, and numeric bounds (qty 0–10,000, rate 0–1,000,000, tax 0–100%, max 50 line items). |
| 6 | Low | XSS defense-in-depth | A handful of `innerHTML` assignments interpolated Stripe-generated IDs/URLs (`inv.id`, `inv.hostedInvoiceUrl`, `s.productId`) into inline `onclick`/`href` attributes without escaping. These values come from Stripe, not from free-text user input, so real risk was minimal, but it broke the pattern used everywhere else in the same files. | Wrapped each in the existing `escapeHtml()` helper for consistency. |
| 7 | Low | Info disclosure | `services.html` logged the full Web3Forms API response (and errors) to the browser console on every lead/booking submission. | Removed the `console.log`/`console.error` calls; failures now fail silently client-side (the booking flow doesn't depend on that response). |
| 8 | Info | Content protection (Phase 4) | The public site had no deterrents against casual right-click/inspect/copy. | Added `security.js`, included on all 6 TECH24 pages: blocks the context menu and F12/Ctrl+Shift+I/J/C/Ctrl+U/Ctrl+S outside form fields, disables image dragging, and sets `user-select: none` on `body` with an explicit `user-select: text` exception for `input`/`textarea`/`select`/`[contenteditable]` so all forms (booking form, admin invoice/service forms, login) stay fully usable. Keyboard navigation (Tab, arrows), zoom, and screen readers are untouched. |

## Deliberately not done, and why

- **JS bundling/minification/obfuscation of production code.** This is a
  zero-build static site by design — introducing a bundler is a real
  architecture change (new build step, new failure mode, new tooling to
  maintain) that your own instructions say to stop and ask about before
  doing. I did not do it. If you want this, the lowest-risk path is adding
  a Vercel Build Step with a minifier (e.g. esbuild) that only minifies, not
  a rewrite of how the site is authored or served.
- **Devtools-open detection with a blur overlay.** Skipped: these checks
  (window size deltas, timing probes) are unreliable — they false-positive
  on window resizing, docked devtools, and some browser zoom levels — and
  risk locking you out of your own site while debugging it. Real protection
  for anything sensitive is server-side auth, which is already in place.
- **Print blocking.** Skipped: `admin.html`'s "Print / Save PDF" button
  depends on `window.print()`. Blocking it site-wide would have broken that
  feature, which your instructions explicitly say not to do.
- **Watermarking.** Skipped as not needed for a marketing/business site;
  straightforward to add later if you want it on the invoice PDF.
- **Source maps.** None are generated (no build step produces any), so
  there's nothing to disable.

## Secrets

No hardcoded secrets were found in the tracked files. `STRIPE_SECRET_KEY`
and `ADMIN_PASSWORD` are correctly kept out of both public repos and live
only as Vercel Environment Variables. **Nothing needs rotating.**

## Dependencies

`npm audit --omit=dev` reports **0 vulnerabilities**. The only runtime
dependency is `stripe`, pinned via `package-lock.json`.

## Manual action items (things I can't do for you)

1. **Enable a WAF / Vercel Attack Challenge Mode** on the project for
   real brute-force and bot protection — the in-memory rate limit added
   here (#4) is a best-effort speed bump only.
2. **Consider rotating `ADMIN_PASSWORD`** periodically, and use a longer,
   randomly-generated value rather than a memorable word — I didn't change
   its value since that's a workflow decision only you should make.
3. **After this deploys**, open the live site's DevTools Network tab once
   and confirm the Calendly widget and the Web3Forms booking submission
   still load cleanly under the new Content-Security-Policy — I verified
   every external domain the site currently calls (`assets.calendly.com`,
   `calendly.com`, `fonts.googleapis.com`, `fonts.gstatic.com`,
   `api.web3forms.com`) is allow-listed in the CSP, but this sandbox can't
   reach those domains to confirm live, so a one-time manual check after
   deploy is worth doing.

## Verification performed

- `npm audit --omit=dev`: 0 vulnerabilities.
- `node --check` on every edited/new JS file: all pass.
- `vercel.json` validated as well-formed JSON.
- Local Playwright smoke test (mocked API responses, served over a local
  static file server since live Stripe calls are network-blocked from this
  sandbox): `services.html`, `packages.html`, `policy.html`, and
  `admin-login.html` load with no JS runtime errors; right-click is
  correctly blocked outside form fields; the admin login → dashboard flow
  works end-to-end; a form input (`admin-services.html`'s service-name
  field) remains focusable and typable despite the new `user-select: none`
  rule.
