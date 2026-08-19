# Phase 5 — Random Payout ("Packing") Engine

## 1. Run the new SQL

`sql/005_payout_engine.sql`:

- Adds `ajo_pools.current_cycle` (which cycle is currently being
  collected for) and `pool_members.has_packed` (whether that member has
  already received a payout).
- Enables `pgcrypto` if it isn't already (needed for `gen_random_bytes()`
  in the draw).
- **Fixes `ajo_pools`'s UPDATE/DELETE RLS policies** to use
  `is_pool_admin(id)` instead of only `admin_id = auth.uid()`. This was
  a real gap: `trigger_random_payout()` needs to update `ajo_pools`
  (status, current_cycle) as the calling admin, and a co-admin added via
  `pool_members.role = 'admin'` (rather than the original creator) would
  otherwise have that update silently match zero rows — the draw would
  still record a winner and a payout, but the pool's cycle would never
  advance. Same class of bug fixed at the page level in phase 4, now
  fixed at the RLS layer where it actually needed to be.
- Creates `trigger_random_payout(p_pool_id uuid)`.

Run it after `sql/001`–`sql/004`.

## 2. Install the confetti library

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

## How `trigger_random_payout` works

1. Confirms the caller is a pool admin (friendly error; RLS backs this
   up regardless) and locks the pool row (`for update`) so two
   concurrent draw requests for the same pool can't both succeed.
2. Rejects pools that are already `completed` or `cancelled`.
3. Finds eligible members: `status = 'active'`, `has_packed = false`,
   and an `approved` `payment_receipts` row for the pool's
   `current_cycle`.
4. Picks one by ordering the eligible rows on `gen_random_bytes(8)` —
   pgcrypto's CSPRNG, not the weaker `random()` — and taking the first,
   with `for update of pm` to lock the winning row too.
5. Sets `has_packed = true`, and logs a `payout_records` row with
   `status = 'scheduled'`. The amount is the **pot**, not one person's
   contribution: `contribution_amount × active member count` — that's
   the whole premise of an Ajo circle. Marking it `paid` once the admin
   actually hands the money over is a natural next step for a future
   phase.
6. If every active member has now packed, the pool is marked
   `completed`. Otherwise `current_cycle` advances by 1 and the pool is
   (re)marked `active` — so the very first draw also flips a `pending`
   pool into `active`.

**`has_packed` vs. `payout_position`**: `payout_position` (phase 1) is
just the informational order members joined in — it was never meant to
dictate who gets paid when. This phase's draw is the actual selection
mechanism, per the brief. Both can coexist: the queue order shows in the
member list, while `has_packed` and `payout_records` are the source of
truth for who's actually been paid.

## New files

```
sql/005_payout_engine.sql                Schema additions, RLS fix, the draw function
lib/validations/payout.ts                Zod schema for the draw request body
app/api/payout/draw/route.ts             POST /api/payout/draw
components/payouts/draw-payout-button.tsx  Calls the route, fires confetti, toasts the winner
```

Touched: `components/pools/member-list.tsx` (shows a "Packed" tag),
`app/dashboard/pools/[poolId]/page.tsx` (new "Payout draw" section:
current cycle, eligible count, the draw button — visible to admins on
`pending`/`active` pools only).

## Notes

- **Confetti respects `prefers-reduced-motion`** and skips itself
  entirely if the user has that set — the success toast still shows
  either way.
- **The API route's status codes are message-based** (`error.message`
  starts with `"Only the pool admin"` → 403, everything else → 409).
  `raise exception` in plpgsql doesn't carry a structured error code
  unless you assign one explicitly with `using errcode = ...` on every
  branch; message-matching is the pragmatic tradeoff here rather than
  wiring that up for two cases.
- **Late joiners**: someone added to a pool mid-way through simply has
  `has_packed = false` and enters the draw pool as soon as they pay for
  whatever the pool's current cycle is — there's no pro-rating for
  cycles they missed before joining. Intentionally simple for this phase.
