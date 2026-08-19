# Ajo — Rotational Contribution App

Full-stack Next.js 14 + Supabase app for running Ajo (rotational
savings/tontine) circles: pool creation, member invites, receipt-based
payment verification, a random "packing" payout draw, and admin/member
dashboards. Built across 6 phases — this file is the single entry point
for setting the whole thing up. `README-PHASE2.md` through
`README-PHASE6.md` remain as detailed, phase-by-phase notes if you want
the reasoning behind a specific piece.

## Before you start reading this as "tested and verified"

I built and statically reviewed every file in this project, but I did
**not** run `npm install`, `next build`, `next dev`, or `tsc --noEmit`
against it — this environment has no network access (so no package
registry) and no live Supabase project to run queries against. What I
*did* do, concretely:

- Verified every `@/...` import in the project resolves to a real file
  (the only "unresolved" ones are shadcn/ui primitives that the CLI
  generates — expected, not a bug).
- Verified every `supabase.rpc("...")` call has a matching SQL function
  definition, and vice versa.
- Verified every dynamic route uses the same `[poolId]` param name
  (a real Next.js build error if it didn't).
- Verified every file using client-only hooks has `"use client"`.
- Checked enum/type unions for drift across files (`pool_status`,
  `receipt_status`, member roles).
- Found and fixed three real issues along the way:
  1. **The phase-1 schema file was never in the `sql/` sequence** — it
     was created before this project folder existed and stayed as a
     loose file. Copied in as `sql/001_initial_schema.sql`.
  2. **`ajo_pools`'s UPDATE/DELETE RLS policies only checked
     `admin_id`**, not `is_pool_admin()` — a co-admin (not the original
     creator) could add members and review receipts fine, but a
     `trigger_random_payout()` call from them would silently fail to
     advance the pool's cycle. Fixed in `sql/005`.
  3. **API routes could get redirected to the `/login` HTML page**
     instead of a JSON 401 when a session had expired, because
     `/api/*` wasn't exempted from the middleware's redirect logic — a
     `fetch().then(r => r.json())` call would have thrown trying to
     parse HTML. Fixed in `lib/supabase/middleware.ts`.

Before you deploy, please actually run `npm install && npm run build`
and `npm run typecheck` yourself — that's real compiler/bundler
verification I'm not able to perform here, and it's the right final
gate regardless of how careful the static review was.

## Stack

Next.js 14 (App Router) · Supabase (Postgres, Auth, Storage, Realtime) ·
`@supabase/ssr` · Tailwind CSS · shadcn/ui · React Hook Form + Zod ·
Recharts · next-themes · canvas-confetti

## Setup

### 1. Create a Supabase project, then run the SQL migrations in order

In the Supabase SQL editor, run each file in `sql/` **in numeric order**:

```
001_initial_schema.sql      Tables, enums, RLS, storage bucket + policies
002_add_is_admin.sql        profiles.is_admin (global admin flag)
003_pool_management_rpc.sql create_ajo_pool, search_users_for_invite, add_pool_member
004_payment_workflow.sql    Bank detail columns, Realtime on payment_receipts
005_payout_engine.sql       current_cycle, has_packed, trigger_random_payout, RLS fix
006_dashboard_stats.sql     admin_dashboard_stats, admin_pool_compliance
```

### 2. Configure Supabase Auth

- **Authentication → Providers → Email**: enable, with confirmations on.
- **Authentication → Providers → Phone**: enable, connect an SMS provider
  (Twilio, MessageBird, or Vonage) — phone OTP won't send without one.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your project's URL and
anon key (Project Settings → API), plus your site URL.

### 4. Install dependencies

```bash
npm install
```

The shadcn/ui primitives (`button`, `input`, `form`, `dialog`, `select`,
etc.) are already written into `components/ui/` — there's no
`npx shadcn add` step. `npm install` pulls in their Radix UI and
`class-variance-authority` dependencies, already listed in
`package.json`.

### 5. Run it

```bash
npm run dev
```

## Deploying entirely from a phone (no computer)

Everything above works from a phone's browser except one thing: getting
110 nested files into a GitHub repo, which a mobile file picker can't do
reliably (it can select files, not preserve a folder structure). The fix
is to upload the **zip** — a single file — into a cloud dev environment
and unzip it there.

1. **Download `ajo-app.zip`** from this chat onto your phone.
2. **Create an empty repo on GitHub** (github.com in your mobile
   browser → your avatar → *Your repositories* → **New** → name it,
   leave it empty, **Create repository**).
3. **Open a Codespace on it**: on the repo page, tap **Code** → the
   **Codespaces** tab → **Create codespace on main**. This opens a full
   VS Code + terminal in your browser — no install needed.
4. **Upload the zip**: in the Codespace's file explorer (left sidebar),
   tap the **⋯** menu → **Upload...** → pick `ajo-app.zip` from your
   phone.
5. **Unzip and push**, in the terminal panel (copy-paste these, don't
   retype them):
   ```bash
   unzip ajo-app.zip
   git add .
   git commit -m "Initial commit"
   git push
   ```
   (Codespaces is already authenticated to push to the repo it opened
   from, so no login step here.)
6. **Continue from "Import into Vercel" below** — when you get to the
   import screen, set the project's **Root Directory** to `ajo-app`
   (since the unzip left everything nested one folder deep), since you
   didn't flatten it — that's intentional, it avoids fragile `mv`
   commands on a phone keyboard.

A tablet with a keyboard makes step 5 much less fiddly than a phone
screen, if you have the option — but the phone-only path above does
work end to end.

## Deploying (Vercel)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it in Vercel.
   - **Desktop path** (pushed from inside `ajo-app/` as the repo root):
     leave **Root Directory** as-is.
   - **Phone/Codespaces path** above: the repo has an `ajo-app/` folder
     sitting inside it — set **Root Directory** to `ajo-app` in the
     import screen.
3. Add the three env vars from `.env.example` in the Vercel project
   settings — set `NEXT_PUBLIC_SITE_URL` to your production domain (this
   is what the email-confirmation link points to).
4. Deploy. Framework preset is auto-detected as Next.js; no build
   command changes needed.
5. Back in Supabase, add your production URL to **Authentication → URL
   Configuration → Redirect URLs** (needed for the email confirmation
   flow to redirect back correctly).

## Manual QA checklist

Since I couldn't run this against a live backend, here's the walkthrough
I'd run before trusting a deploy — plan for two accounts (an admin and a
member) in a private/incognito window for the second one:

**Auth**
- [ ] Sign up with email → confirmation email arrives → clicking it logs
      you in and lands on `/`.
- [ ] Sign up/in with phone OTP.
- [ ] Sign out, then hit `/dashboard/my-pools` directly — redirected to
      `/login`.
- [ ] Visit `/admin` as a non-`is_admin` user — redirected away.

**Pool creation & members**
- [ ] Create a pool through all 4 wizard steps; land on its detail page.
- [ ] As the creator, add a second account as a member via email/phone
      search on the pool detail page.
- [ ] Second account: `/dashboard/my-pools` shows the pool; a third,
      unrelated account does **not** see it (RLS check).

**Payments**
- [ ] Admin sets bank details on the pool detail page.
- [ ] Member visits `/dashboard/pools/[id]/pay`, sees the bank details,
      uploads a receipt (try a PNG and a PDF).
- [ ] Admin's `/dashboard/pools/[id]/admin/approvals` shows it under
      Pending, with a working preview; Approve/Reject updates live in a
      second open tab (Realtime check).

**Payout draw**
- [ ] With at least one member's receipt approved for the current cycle,
      admin clicks "Draw this cycle's payout" on the pool detail page —
      confetti fires, a winner is announced, `current_cycle` advances,
      and the winner shows "Packed" in the member list.
- [ ] Draw again once every active member has packed — pool status
      flips to Completed.

**Dashboards & polish**
- [ ] `/dashboard/admin` shows correct metric cards and a compliance
      chart for pools you administer.
- [ ] `/dashboard/member` shows your active pools, queue position/packed
      status, and payment history.
- [ ] Toggle dark/light theme in the header — persists on reload.
- [ ] Resize to a phone width — nav, cards, and tables stay usable
      (tables scroll horizontally rather than breaking layout).
- [ ] Throttle network in devtools — skeleton states appear on
      `/dashboard/my-pools`, `/dashboard/admin`, `/dashboard/member`, and
      a pool detail page before content loads.

## Known limitations (intentional scope boundaries, not oversights)

- No generated Supabase TypeScript types (`supabase gen types
  typescript`) — several embedded-relation queries use manual type casts
  instead of full end-to-end type safety. Worth generating once you have
  a live project.
- Payout draws are admin-triggered, not cron-scheduled — "Next estimated
  draw" on the admin overview is a projection, not a guarantee.
- `payout_records.status` stops at `'scheduled'` — there's no UI yet to
  mark a payout as actually `'paid'` once money changes hands outside
  the app.
- The global platform-admin console at `/admin` (gated by
  `profiles.is_admin`) is still just the phase-2 stub — nothing in this
  project builds it out further.
