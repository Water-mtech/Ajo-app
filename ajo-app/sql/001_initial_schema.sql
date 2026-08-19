-- =====================================================================
-- AJO (ROTATIONAL CONTRIBUTION) APP — SUPABASE POSTGRES SCHEMA
-- =====================================================================
-- Run this in the Supabase SQL Editor (or via `supabase db push`).
-- Assumes the default `auth` schema and `public` schema already exist.
--
-- Storage path convention for receipts:
--   receipts/{pool_id}/{user_id}/{filename}
-- This convention is what the storage policies below rely on.
-- =====================================================================


-- =====================================================================
-- 1. ENUM TYPES
-- =====================================================================

create type public.pool_frequency as enum ('weekly', 'biweekly', 'monthly');

create type public.pool_status as enum ('pending', 'active', 'completed', 'cancelled');

create type public.member_role as enum ('admin', 'member');

create type public.member_status as enum ('invited', 'active', 'removed', 'completed');

create type public.receipt_status as enum ('pending', 'approved', 'rejected');

create type public.payout_status as enum ('scheduled', 'paid', 'failed');


-- =====================================================================
-- 2. TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: 1:1 extension of auth.users
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  phone        text unique,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'App-level user profile, 1:1 with auth.users.';

-- ---------------------------------------------------------------------
-- ajo_pools: a single rotating contribution circle
-- ---------------------------------------------------------------------
create table public.ajo_pools (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  description          text,
  admin_id             uuid not null references public.profiles (id) on delete restrict,
  contribution_amount  numeric(12, 2) not null check (contribution_amount > 0),
  currency             text not null default 'NGN',
  frequency            public.pool_frequency not null default 'monthly',
  max_members          integer not null check (max_members > 1),
  status               public.pool_status not null default 'pending',
  start_date           date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.ajo_pools is 'A single Ajo / rotational savings circle.';

-- ---------------------------------------------------------------------
-- pool_members: membership + rotation order + role within a pool
-- ---------------------------------------------------------------------
create table public.pool_members (
  id               uuid primary key default gen_random_uuid(),
  pool_id          uuid not null references public.ajo_pools (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.member_role not null default 'member',
  payout_position  integer check (payout_position > 0),
  status           public.member_status not null default 'active',
  joined_at        timestamptz not null default now(),
  unique (pool_id, user_id),
  unique (pool_id, payout_position)
);

comment on table public.pool_members is 'Join table: which users belong to which pools, and their rotation slot.';

-- ---------------------------------------------------------------------
-- payment_receipts: proof-of-payment uploads awaiting admin review
-- ---------------------------------------------------------------------
create table public.payment_receipts (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references public.ajo_pools (id) on delete cascade,
  member_id      uuid not null references public.profiles (id) on delete cascade,
  cycle_number   integer not null check (cycle_number > 0),
  amount         numeric(12, 2) not null check (amount > 0),
  receipt_url    text not null,           -- path inside the `receipts` storage bucket
  status         public.receipt_status not null default 'pending',
  reviewed_by    uuid references public.profiles (id),
  reviewed_at    timestamptz,
  submitted_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

comment on table public.payment_receipts is 'Member-submitted proof of a contribution payment for a given cycle.';

-- ---------------------------------------------------------------------
-- payout_records: who received the pooled payout for each cycle
-- ---------------------------------------------------------------------
create table public.payout_records (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references public.ajo_pools (id) on delete cascade,
  recipient_id   uuid not null references public.profiles (id) on delete cascade,
  cycle_number   integer not null check (cycle_number > 0),
  amount         numeric(12, 2) not null check (amount > 0),
  status         public.payout_status not null default 'scheduled',
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (pool_id, cycle_number)
);

comment on table public.payout_records is 'Record of the payout disbursed to the recipient of each rotation cycle.';


-- =====================================================================
-- 3. INDEXES
-- =====================================================================

create index idx_ajo_pools_admin_id        on public.ajo_pools (admin_id);
create index idx_pool_members_pool_id      on public.pool_members (pool_id);
create index idx_pool_members_user_id      on public.pool_members (user_id);
create index idx_payment_receipts_pool_id  on public.payment_receipts (pool_id);
create index idx_payment_receipts_member   on public.payment_receipts (member_id);
create index idx_payment_receipts_status   on public.payment_receipts (status);
create index idx_payout_records_pool_id    on public.payout_records (pool_id);
create index idx_payout_records_recipient  on public.payout_records (recipient_id);


-- =====================================================================
-- 4. updated_at MAINTENANCE TRIGGER
-- =====================================================================

create or replace function public.trigger_set_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_timestamp_profiles
before update on public.profiles
for each row execute function public.trigger_set_timestamp();

create trigger set_timestamp_ajo_pools
before update on public.ajo_pools
for each row execute function public.trigger_set_timestamp();


-- =====================================================================
-- 5. OPTIONAL: AUTO-CREATE A PROFILE ROW WHEN A USER SIGNS UP
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- =====================================================================
-- 6. HELPER FUNCTIONS FOR RLS (SECURITY DEFINER avoids recursive-policy
--    errors that occur when a table's policy re-queries itself).
-- =====================================================================

create or replace function public.is_pool_member(p_pool_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.pool_members pm
    where pm.pool_id = p_pool_id
      and pm.user_id = auth.uid()
      and pm.status <> 'removed'
  );
$$;

create or replace function public.is_pool_admin(p_pool_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.ajo_pools p
    where p.id = p_pool_id
      and p.admin_id = auth.uid()
  )
  or exists (
    select 1
    from public.pool_members pm
    where pm.pool_id = p_pool_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
      and pm.status = 'active'
  );
$$;

comment on function public.is_pool_member is 'True if the current auth.uid() is an active member of the given pool.';
comment on function public.is_pool_admin  is 'True if the current auth.uid() is the pool creator or has an admin role in it.';


-- =====================================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.ajo_pools        enable row level security;
alter table public.pool_members     enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.payout_records   enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can view co-members' profiles"
on public.profiles for select
using (
  exists (
    select 1
    from public.pool_members pm1
    join public.pool_members pm2 on pm1.pool_id = pm2.pool_id
    where pm1.user_id = auth.uid()
      and pm2.user_id = profiles.id
  )
);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- ajo_pools
-- Requirement: users can only view pools where their user_id exists
-- in pool_members. (Admins are also members, per the bootstrap flow
-- described below the policies.)
-- ---------------------------------------------------------------------
create policy "Members can view their pools"
on public.ajo_pools for select
using (public.is_pool_member(id));

create policy "Any authenticated user can create a pool"
on public.ajo_pools for insert
to authenticated
with check (admin_id = auth.uid());

create policy "Admins can update their pools"
on public.ajo_pools for update
using (admin_id = auth.uid())
with check (admin_id = auth.uid());

create policy "Admins can delete their pools"
on public.ajo_pools for delete
using (admin_id = auth.uid());

-- NOTE ON BOOTSTRAPPING: when a pool is created, `admin_id = auth.uid()`
-- but no pool_members row exists yet. is_pool_admin() checks
-- ajo_pools.admin_id directly (not just pool_members), so the very next
-- statement — inserting the creator into pool_members with role='admin' —
-- is allowed by the pool_members INSERT policy below. Do this insert
-- inside the same transaction as pool creation.

-- ---------------------------------------------------------------------
-- pool_members
-- ---------------------------------------------------------------------
create policy "Members can view fellow pool members"
on public.pool_members for select
using (public.is_pool_member(pool_id));

create policy "Admins can add members"
on public.pool_members for insert
with check (public.is_pool_admin(pool_id));

create policy "Admins can update members"
on public.pool_members for update
using (public.is_pool_admin(pool_id))
with check (public.is_pool_admin(pool_id));

create policy "Admins can remove members"
on public.pool_members for delete
using (public.is_pool_admin(pool_id));

-- ---------------------------------------------------------------------
-- payment_receipts
-- Requirement: members can insert/upload receipts only for pools they
-- belong to. Admins can approve/reject receipts for pools they administer.
-- ---------------------------------------------------------------------
create policy "Members view own receipts, admins view all pool receipts"
on public.payment_receipts for select
using (member_id = auth.uid() or public.is_pool_admin(pool_id));

create policy "Members upload receipts for their own pools"
on public.payment_receipts for insert
with check (
  member_id = auth.uid()
  and public.is_pool_member(pool_id)
);

create policy "Admins approve or reject receipts"
on public.payment_receipts for update
using (public.is_pool_admin(pool_id))
with check (public.is_pool_admin(pool_id));

create policy "Members can delete their own pending receipts"
on public.payment_receipts for delete
using (member_id = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------
-- payout_records
-- ---------------------------------------------------------------------
create policy "Members view payouts for their pools"
on public.payout_records for select
using (recipient_id = auth.uid() or public.is_pool_admin(pool_id));

create policy "Admins create payout records"
on public.payout_records for insert
with check (public.is_pool_admin(pool_id));

create policy "Admins update payout records"
on public.payout_records for update
using (public.is_pool_admin(pool_id))
with check (public.is_pool_admin(pool_id));

create policy "Admins delete payout records"
on public.payout_records for delete
using (public.is_pool_admin(pool_id));


-- =====================================================================
-- 8. STORAGE: private `receipts` bucket + policies
-- Path convention: {pool_id}/{user_id}/{filename}
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,                              -- private bucket
  10485760,                           -- 10 MB per file
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Members can upload only into their own folder, inside a pool they belong to.
create policy "Members upload receipts into their own pool folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and public.is_pool_member( ((storage.foldername(name))[1])::uuid )
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- The uploader can always view their own files.
create policy "Uploader can view own receipt files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Pool admins can view every receipt file in pools they administer.
create policy "Admins can view their pool's receipt files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_pool_admin( ((storage.foldername(name))[1])::uuid )
);

-- Uploader can remove their own file while it's still pending review.
create policy "Uploader can delete own receipt file"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Admins can delete files in pools they administer (e.g. rejected/invalid uploads).
create policy "Admins can delete their pool's receipt files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and public.is_pool_admin( ((storage.foldername(name))[1])::uuid )
);

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
