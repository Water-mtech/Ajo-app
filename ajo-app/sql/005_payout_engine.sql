-- =====================================================================
-- Phase 5: random payout ("packing") engine
-- =====================================================================

-- ---------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------

-- Which cycle is currently being collected for. Draws always operate on
-- this value and advance it by 1 on success.
alter table public.ajo_pools
  add column if not exists current_cycle integer not null default 1;

-- Whether this member has already received a payout. Note this is a
-- separate concept from pool_members.payout_position (phase 1), which
-- is just the informational queue order assigned at signup — the actual
-- payout order is decided by this random draw, cycle by cycle.
alter table public.pool_members
  add column if not exists has_packed boolean not null default false;

-- gen_random_bytes() (used below for the draw) lives in pgcrypto.
-- Supabase projects usually already have this; safe to no-op if so.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Consistency fix: ajo_pools UPDATE/DELETE (phase 1) only checked
-- admin_id, not is_pool_admin(). trigger_random_payout() below needs to
-- update ajo_pools (status, current_cycle) as the calling admin, and
-- that admin might be a co-admin added via pool_members.role = 'admin'
-- rather than the original creator — is_pool_admin() already accounts
-- for both, so these policies should too (same fix already applied at
-- the page level in phase 4).
-- ---------------------------------------------------------------------
drop policy if exists "Admins can update their pools" on public.ajo_pools;
create policy "Admins can update their pools"
on public.ajo_pools for update
using (public.is_pool_admin(id))
with check (public.is_pool_admin(id));

drop policy if exists "Admins can delete their pools" on public.ajo_pools;
create policy "Admins can delete their pools"
on public.ajo_pools for delete
using (public.is_pool_admin(id));

-- ---------------------------------------------------------------------
-- trigger_random_payout: picks one winner among members who are active,
-- haven't packed yet, and have an approved receipt for the pool's
-- current cycle; logs the payout; advances the cycle or, if everyone
-- has now packed, marks the pool completed.
-- ---------------------------------------------------------------------
create or replace function public.trigger_random_payout(p_pool_id uuid)
returns public.payout_records
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_pool         public.ajo_pools;
  v_winner       public.pool_members;
  v_active_count integer;
  v_remaining    integer;
  v_pot_amount   numeric(12, 2);
  v_payout       public.payout_records;
begin
  if not public.is_pool_admin(p_pool_id) then
    raise exception 'Only the pool admin can trigger a payout draw';
  end if;

  -- Lock the pool row so two concurrent draw requests for the same pool
  -- can't both succeed against the same cycle.
  select * into v_pool from public.ajo_pools where id = p_pool_id for update;

  if v_pool is null then
    raise exception 'Pool not found';
  end if;

  if v_pool.status in ('completed', 'cancelled') then
    raise exception 'This pool is % and no longer accepting payouts', v_pool.status;
  end if;

  -- Eligible = active, hasn't packed yet, has an approved receipt for
  -- the current cycle. gen_random_bytes(8) is pgcrypto's CSPRNG — bytea
  -- values order lexicographically, so sorting by a fresh random value
  -- per row is a valid, hard-to-predict shuffle (stronger than relying
  -- on random(), which is a fine fairness tool but not CSPRNG-backed).
  select pm.* into v_winner
  from public.pool_members pm
  where pm.pool_id = p_pool_id
    and pm.status = 'active'
    and pm.has_packed = false
    and exists (
      select 1
      from public.payment_receipts pr
      where pr.pool_id = p_pool_id
        and pr.member_id = pm.user_id
        and pr.cycle_number = v_pool.current_cycle
        and pr.status = 'approved'
    )
  order by gen_random_bytes(8)
  limit 1
  for update of pm;

  if v_winner is null then
    raise exception
      'No eligible members for cycle % — everyone still needs to pay, or everyone has already packed',
      v_pool.current_cycle;
  end if;

  select count(*) into v_active_count
  from public.pool_members
  where pool_id = p_pool_id and status = 'active';

  -- The pot is everyone's contribution for this cycle, not just the
  -- winner's own — that's the whole point of an Ajo circle.
  v_pot_amount := v_pool.contribution_amount * v_active_count;

  update public.pool_members
  set has_packed = true
  where id = v_winner.id;

  insert into public.payout_records (pool_id, recipient_id, cycle_number, amount, status)
  values (p_pool_id, v_winner.user_id, v_pool.current_cycle, v_pot_amount, 'scheduled')
  returning * into v_payout;

  select count(*) into v_remaining
  from public.pool_members
  where pool_id = p_pool_id and status = 'active' and has_packed = false;

  if v_remaining = 0 then
    update public.ajo_pools set status = 'completed' where id = p_pool_id;
  else
    update public.ajo_pools
    set status = 'active', current_cycle = current_cycle + 1
    where id = p_pool_id;
  end if;

  return v_payout;
end;
$$;

revoke all on function public.trigger_random_payout from public;
grant execute on function public.trigger_random_payout to authenticated;
