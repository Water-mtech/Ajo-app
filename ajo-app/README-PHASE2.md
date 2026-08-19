# Phase 2 — Auth & Protected Routes

## 1. Run the SQL prerequisite

`sql/002_add_is_admin.sql` adds the `profiles.is_admin` column the middleware
checks for `/admin` routes (Phase 1 only had pool-level admin via
`ajo_pools.admin_id` / `pool_members.role`, which is a different concept).
Run it in the Supabase SQL editor before testing.

## 2. Install packages

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install react-hook-form @hookform/resolvers zod
npm install sonner clsx tailwind-merge
npm install -D tailwindcss-animate
```

## 3. Init shadcn/ui and add the components used here

```bash
npx shadcn@latest init
npx shadcn@latest add button input label card form tabs sonner
```

`npx shadcn init` will generate its own `components.json`, `lib/utils.ts`,
and `tailwind.config.ts`. The `tailwind.config.ts` and `app/globals.css` in
this folder already include shadcn's expected tokens (`background`,
`primary`, `border`, etc.) plus the Ajo brand tokens — merge them into
whatever shadcn's CLI generates rather than discarding either.

## 4. Environment variables (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 5. Enable auth providers in the Supabase dashboard

- **Authentication → Providers → Email**: confirmations on (the signup flow
  sends a confirmation link to `/auth/callback`).
- **Authentication → Providers → Phone**: turn on and connect an SMS
  provider (Twilio, MessageBird, or Vonage) — phone OTP won't send without one.

## File map

```
middleware.ts                        Root middleware — protects routes, gates /admin
lib/supabase/client.ts               Browser Supabase client
lib/supabase/server.ts               Server Component / Server Action Supabase client
lib/supabase/middleware.ts           Session refresh + redirect + is_admin logic
lib/validations/auth.ts              Zod schemas (email, phone request, phone verify)
lib/utils.ts                         cn() helper
app/actions/auth.ts                  Server actions: sign in/up, OTP request/verify, sign out
app/auth/callback/route.ts           Email confirmation link handler
app/layout.tsx                       Fonts (Fraunces/Inter/IBM Plex Mono) + Toaster
app/globals.css                      Design tokens
app/page.tsx                         Protected home stub
app/admin/page.tsx                   is_admin-gated stub
app/(auth)/layout.tsx                Split-screen brand + form layout
app/(auth)/login/page.tsx
app/(auth)/signup/page.tsx
components/auth/rotation-ring.tsx    Signature SVG (rotation mechanic)
components/auth/login-form.tsx       Email + Phone OTP tabs
components/auth/signup-form.tsx      Email + Phone OTP tabs
```

## Design notes

The auth screens use a dark ink-navy brand panel with a gold accent instead
of the generic light-cream/serif or near-black/neon-green fintech look. The
signature element — a ring of member nodes with one lit gold — isn't
decoration; it's a literal diagram of the Ajo rotation (whose turn it is to
receive the pot). Amounts, phone numbers, and OTP digits use IBM Plex Mono
throughout for ledger-style precision; headlines use Fraunces; UI/body text
uses Inter.
