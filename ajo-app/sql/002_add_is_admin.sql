-- Phase 2 prerequisite.
-- middleware.ts checks profiles.is_admin to gate everything under /admin.
-- This is a global app-level flag, distinct from ajo_pools.admin_id /
-- pool_members.role, which only govern admin rights inside a single pool.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Promote a specific user to a global admin (run manually as needed):
-- update public.profiles set is_admin = true where id = '<user-uuid>';
