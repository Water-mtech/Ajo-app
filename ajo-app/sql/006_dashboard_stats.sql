-- =====================================================================
-- Phase 6: admin overview dashboard stats
-- =====================================================================
-- Both functions are scoped to "pools the caller administers"
-- (pool_members.role = 'admin'), computed server-side in one round trip
-- rather than pulling raw rows into the client and summing there.

-- ---------------------------------------------------------------------
-- admin_dashboard_stats: active pool count, pending approvals count,
-- liquidity grouped by currency (never summed across currencies), and
-- an estimated next draw date.
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pool_ids           uuid[];
  v_active_pools        integer;
  v_pending_approvals   integer;
  v_liquidity           jsonb;
  v_next_draw           date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select array_agg(pool_id) into v_pool_ids
  from public.pool_members
  where user_id = auth.uid() and role = 'admin';

  if v_pool_ids is null then
    return jsonb_build_object(
      'active_pools', 0,
      'pending_approvals', 0,
      'liquidity_by_currency', '[]'::jsonb,
      'next_draw_date', null
    );
  end if;

  select count(*) into v_active_pools
  from public.ajo_pools
  where id = any(v_pool_ids) and status = 'active';

  select count(*) into v_pending_approvals
  from public.payment_receipts
  where pool_id = any(v_pool_ids) and status = 'pending';

  -- Liquidity per pool = approved receipts collected minus everything
  -- already logged in payout_records for that pool, then summed by
  -- currency — currencies are never added together.
  with collected as (
    select p.id as pool_id, p.currency, coalesce(sum(pr.amount), 0) as collected_amount
    from public.ajo_pools p
    left join public.payment_receipts pr
      on pr.pool_id = p.id and pr.status = 'approved'
    where p.id = any(v_pool_ids)
    group by p.id, p.currency
  ),
  paid_out as (
    select pool_id, coalesce(sum(amount), 0) as payout_amount
    from public.payout_records
    where pool_id = any(v_pool_ids)
    group by pool_id
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('currency', t.currency, 'amount', t.total) order by t.currency),
    '[]'::jsonb
  )
  into v_liquidity
  from (
    select c.currency, sum(c.collected_amount - coalesce(po.payout_amount, 0)) as total
    from collected c
    left join paid_out po on po.pool_id = c.pool_id
    group by c.currency
  ) t;

  -- Estimated next draw date: soonest upcoming cycle date across active
  -- pools, derived from start_date + (current_cycle - 1) steps of the
  -- pool's frequency. This is a projection from the cycle cadence, not
  -- a cron-scheduled event — draws are still admin-triggered (phase 5).
  select min(
    case p.frequency
      when 'weekly'   then p.start_date + ((p.current_cycle - 1) * interval '7 days')
      when 'biweekly' then p.start_date + ((p.current_cycle - 1) * interval '14 days')
      else                 p.start_date + ((p.current_cycle - 1) * interval '1 month')
    end
  )::date
  into v_next_draw
  from public.ajo_pools p
  where p.id = any(v_pool_ids) and p.status = 'active' and p.start_date is not null;

  return jsonb_build_object(
    'active_pools', v_active_pools,
    'pending_approvals', v_pending_approvals,
    'liquidity_by_currency', v_liquidity,
    'next_draw_date', v_next_draw
  );
end;
$$;

revoke all on function public.admin_dashboard_stats from public;
grant execute on function public.admin_dashboard_stats to authenticated;

-- ---------------------------------------------------------------------
-- admin_pool_compliance: one row per active pool the caller administers,
-- with the percentage of active members who've paid the current cycle.
-- ---------------------------------------------------------------------
create or replace function public.admin_pool_compliance()
returns table (
  pool_id uuid,
  pool_name text,
  compliance_pct numeric
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    p.id,
    p.name,
    case
      when active_members.cnt = 0 then 0
      else round(100.0 * coalesce(paid.cnt, 0) / active_members.cnt, 1)
    end as compliance_pct
  from public.ajo_pools p
  join public.pool_members admin_check
    on admin_check.pool_id = p.id
    and admin_check.user_id = auth.uid()
    and admin_check.role = 'admin'
  join lateral (
    select count(*) as cnt
    from public.pool_members pm
    where pm.pool_id = p.id and pm.status = 'active'
  ) active_members on true
  left join lateral (
    select count(*) as cnt
    from public.payment_receipts pr
    where pr.pool_id = p.id
      and pr.cycle_number = p.current_cycle
      and pr.status = 'approved'
  ) paid on true
  where p.status = 'active'
  order by p.name;
end;
$$;

revoke all on function public.admin_pool_compliance from public;
grant execute on function public.admin_pool_compliance to authenticated;
