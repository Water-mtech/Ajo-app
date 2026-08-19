# Phase 3 — Ajo Management (Pool Creation, Member Search, My Pools)

## 1. Run the new SQL

`sql/003_pool_management_rpc.sql` adds three functions the server actions
call via `supabase.rpc()`:

- `create_ajo_pool(...)` — creates the pool and seats its creator as the
  first (admin) member in one transaction, so a failure partway through
  never leaves an orphan pool.
- `search_users_for_invite(p_query)` — exact-match lookup by email or
  phone. `auth.users` isn't exposed to PostgREST directly, so this
  `SECURITY DEFINER` function is the one deliberate, narrow window into
  it (no partial/fuzzy matching, by design).
- `add_pool_member(p_pool_id, p_user_id)` — capacity-checked, auto-assigns
  the next payout position, and gives a friendly error instead of a raw
  RLS/constraint violation.

Run it after `sql/001` (from phase 1) and `sql/002_add_is_admin.sql`
(from phase 2).

## 2. Add the new shadcn/ui components

```bash
npx shadcn@latest add textarea radio-group select badge
```

(`button`, `input`, `label`, `card`, `form`, `tabs`, `sonner` were already
added in phase 2.)

## New in this phase

```
sql/003_pool_management_rpc.sql          Pool creation + member search/add RPCs
lib/validations/pool.ts                  Zod schemas: create-pool wizard, invite query
lib/format.ts                            Currency/date formatting + cycle preview
app/dashboard/actions/pools.ts           Server actions wrapping the RPCs
app/dashboard/layout.tsx                 Dashboard shell (nav + sign out)
app/dashboard/pools/new/page.tsx         Pool creation page
app/dashboard/pools/[poolId]/page.tsx    Pool detail: info, member search (admin), member list
app/dashboard/my-pools/page.tsx          Grid of pools the user belongs to (RLS-filtered)
components/pools/pool-creation-form.tsx  4-step wizard: Basics → Money → Structure → Review
components/pools/step-progress.tsx       Step indicator (gold = current/complete)
components/pools/member-search.tsx       Admin: search by email/phone, add to pool
components/pools/member-list.tsx         Current members, payout position, role, status
components/pools/pool-card.tsx           Grid card for My Pools
components/pools/pool-status-badge.tsx   pending→Upcoming, active→Active, completed→Completed
```

## Notes

- **My Pools does no manual membership filtering.** The query is a plain
  `select * from ajo_pools`; the "Members can view their pools" RLS policy
  from phase 1 (`is_pool_member(id)`) is what actually restricts the
  result set. If a pool shows up here, it's because Postgres — not app
  code — confirmed the user belongs to it.
- **Member search only does exact matches.** It won't do `ILIKE '%x%'`
  partial search on purpose — a fuzzy search over `auth.users` would turn
  the endpoint into a way to enumerate every user in the system by email
  or phone. Admins invite people they already have full contact info for.
- **Cycle schedule preview** in the review step is client-side date math
  for a first look only (shown for up to 6 cycles). It isn't the source
  of truth for actual payout dates — that scheduling logic belongs in a
  later phase once pools can transition from `pending` → `active`.
