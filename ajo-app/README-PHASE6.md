# Phase 6 — Dashboard Views, Theming, Skeletons

## 1. Run the new SQL

`sql/006_dashboard_stats.sql` adds two read-only RPCs, both scoped to
"pools the caller administers" (`pool_members.role = 'admin'`) and
computed server-side in one round trip rather than summed in JS:

- `admin_dashboard_stats()` — active pool count, pending approvals count,
  liquidity **grouped by currency** (never summed across currencies —
  see notes below), and an estimated next draw date.
- `admin_pool_compliance()` — one row per active pool with the % of
  active members who've paid the current cycle, feeding the Recharts bar
  chart.

Run it after `sql/001`–`sql/005`.

## 2. Install new dependencies

```bash
npm install next-themes recharts
npx shadcn@latest add skeleton
```

## New in this phase

```
sql/006_dashboard_stats.sql              admin_dashboard_stats(), admin_pool_compliance()
components/theme-provider.tsx            next-themes wrapper
components/theme-toggle.tsx              Sun/moon button (mounted-guard to avoid hydration mismatch)
components/admin/metric-card.tsx         Reusable stat card
components/admin/compliance-chart.tsx    Recharts bar chart, themed via CSS vars
app/dashboard/admin/page.tsx             Admin overview: 4 metrics + compliance chart
app/dashboard/member/page.tsx            Member overview: contribution cards, history, payout position
app/dashboard/*/loading.tsx              Skeleton states (my-pools, admin, member, pool detail)
```

Touched: `app/layout.tsx` (wraps the app in `ThemeProvider`, adds
`suppressHydrationWarning` on `<html>` — required by next-themes),
`app/globals.css` (adds a `.dark` variable block), `app/dashboard/layout.tsx`
(nav links to the two new overviews + the theme toggle).

## Two different "admin" concepts — don't conflate them

- **`/admin`** (phase 2): gated by `profiles.is_admin`, a **global,
  platform-level** flag. Currently just a stub page — nothing in phases
  1–6 builds this out further.
- **`/dashboard/admin`** (this phase): open to any signed-in user: it
  aggregates data across whichever pools *that user personally
  administers* (`pool_members.role = 'admin'`), the same per-pool admin
  concept used everywhere else (approvals, payouts, bank details). If
  someone administers zero pools, they just see an empty state — no
  route-level gate needed, since RLS already scopes every underlying
  query to pools they actually admin.

These are genuinely different things. Don't merge them without deciding
what a "platform admin" is actually meant to see.

## Notes

- **Liquidity is never summed across currencies.** A pool in NGN and a
  pool in USD produce two separate figures in the metric card
  (`₦450,000 · $200`), not one meaningless combined number.
- **"Next estimated draw"** is a projection from `start_date +
  (current_cycle − 1) × frequency`, not a scheduled/cron-triggered event
  — draws are still admin-triggered via the button from phase 5. Labeled
  as an estimate in the UI on purpose.
- **Dark mode and the auth screens**: the split-screen login/signup brand
  panel (phase 2) stays dark ink/gold regardless of theme — that's a
  fixed brand choice (`bg-ink`), not a light/dark state. Only the form
  panel and everything under `/dashboard` respond to the theme toggle.
  Every dashboard component was already built on Tailwind's semantic
  tokens (`bg-card`, `text-foreground`, `border-border`, etc.), so dark
  mode support required no per-component changes — only the `.dark`
  variable block.
- **Status colors** (`ajo-success`, `ajo-danger`, `gold`) are fixed hex
  values in `tailwind.config.ts`, not theme-reactive CSS variables — used
  consistently as tinted backgrounds (`/15` opacity) so they read fine on
  both light and dark surfaces without a separate dark palette.
- **Skeletons follow Next.js's `loading.tsx` convention** (automatic
  Suspense boundaries around each Server Component page), not client-side
  loading state — the right approach here since these pages fetch data
  server-side.
