-- =====================================================================
-- Phase 4: payment & receipt verification workflow
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bank transfer details the admin sets per pool, shown to members on
-- the /pay page. Nullable — a pool can exist before an admin fills
-- these in; the UI shows a "not set yet" state until they do.
-- ---------------------------------------------------------------------
alter table public.ajo_pools
  add column if not exists bank_name text,
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists payment_instructions text;

-- No new RLS needed: "Admins can update their pools" (phase 1) already
-- covers UPDATE on these new columns, and the existing SELECT policy
-- already covers members reading them.

-- ---------------------------------------------------------------------
-- Enable Realtime on payment_receipts so the admin approvals ledger can
-- subscribe to postgres_changes and reflect new submissions / decisions
-- live, without polling or a manual refresh. Delivery still respects
-- RLS — a subscriber only receives change events for rows their own
-- session could SELECT.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.payment_receipts;
