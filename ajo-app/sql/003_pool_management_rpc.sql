-- =====================================================================
-- Phase 3: pool creation, member search & invite RPCs
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_ajo_pool: creates a pool AND seats its creator as the first
-- (admin) member in a single transaction, so a failure partway through
-- never leaves an orphan pool with no members.
-- ---------------------------------------------------------------------
create or replace function public.create_ajo_pool(
  p_name text,
  p_description text,
  p_contribution_amount numeric,
  p_currency text,
  p_frequency public.pool_frequency,
  p_max_members integer,
  p_start_date date
)
returns public.ajo_pools
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pool public.ajo_pools;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.ajo_pools (
    name, description, admin_id, contribution_amount, currency,
    frequency, max_members, status, start_date
  )
  values (
    p_name, p_description, auth.uid(), p_contribution_amount, p_currency,
    p_frequency, p_max_members, 'pending', p_start_date
  )
  returning * into v_pool;

  -- Allowed by the pool_members INSERT policy: is_pool_admin() checks
  -- ajo_pools.admin_id directly, which is already set to auth.uid() above
  -- even though no pool_members row exists yet.
  insert into public.pool_members (pool_id, user_id, role, status, payout_position)
  values (v_pool.id, auth.uid(), 'admin', 'active', 1);

  return v_pool;
end;
$$;

revoke all on function public.create_ajo_pool from public;
grant execute on function public.create_ajo_pool to authenticated;

-- ---------------------------------------------------------------------
-- search_users_for_invite: exact-match lookup by email or phone.
-- SECURITY DEFINER because auth.users isn't exposed to PostgREST — this
-- function is the one narrow, deliberate window into it. Matching is
-- exact only (no partial/fuzzy search), so it can't be used to scrape
-- the user directory.
-- ---------------------------------------------------------------------
create or replace function public.search_users_for_invite(p_query text)
returns table (
  id uuid,
  full_name text,
  phone text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select p.id, p.full_name, p.phone, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id <> auth.uid()
    and (
      lower(u.email) = lower(p_query)
      or p.phone = p_query
    )
  limit 5;
end;
$$;

revoke all on function public.search_users_for_invite from public;
grant execute on function public.search_users_for_invite to authenticated;

-- ---------------------------------------------------------------------
-- add_pool_member: admin-only, capacity-checked, auto-assigns the next
-- payout position. The explicit is_pool_admin() check exists purely to
-- return a friendly error message — the pool_members INSERT policy
-- enforces the same rule regardless of this function.
-- ---------------------------------------------------------------------
create or replace function public.add_pool_member(p_pool_id uuid, p_user_id uuid)
returns public.pool_members
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_max_members   integer;
  v_current_count integer;
  v_next_position integer;
  v_member        public.pool_members;
begin
  if not public.is_pool_admin(p_pool_id) then
    raise exception 'Only the pool admin can add members';
  end if;

  select max_members into v_max_members
  from public.ajo_pools
  where id = p_pool_id;

  if v_max_members is null then
    raise exception 'Pool not found';
  end if;

  select count(*) into v_current_count
  from public.pool_members
  where pool_id = p_pool_id and status <> 'removed';

  if v_current_count >= v_max_members then
    raise exception 'Pool is full (% of % members)', v_current_count, v_max_members;
  end if;

  select coalesce(max(payout_position), 0) + 1 into v_next_position
  from public.pool_members
  where pool_id = p_pool_id;

  begin
    insert into public.pool_members (pool_id, user_id, role, status, payout_position)
    values (p_pool_id, p_user_id, 'member', 'active', v_next_position)
    returning * into v_member;
  exception
    when unique_violation then
      raise exception 'This person is already in the pool';
  end;

  return v_member;
end;
$$;

revoke all on function public.add_pool_member from public;
grant execute on function public.add_pool_member to authenticated;
