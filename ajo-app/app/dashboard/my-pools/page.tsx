import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PoolCard } from "@/components/pools/pool-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My pools — Ajo" };

export default async function MyPoolsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No manual "where I'm a member" filter needed — the "Members can view
  // their pools" RLS policy on ajo_pools (is_pool_member(id)) already
  // restricts this query to pools the signed-in user belongs to.
  const { data: pools, error } = await supabase
    .from("ajo_pools")
    .select(
      "id, name, status, contribution_amount, currency, frequency, max_members, start_date, member_count:pool_members(count)"
    )
    .order("created_at", { ascending: false });

  const { data: myMemberships } = await supabase
    .from("pool_members")
    .select("pool_id, role")
    .eq("user_id", user!.id);

  const roleByPool = new Map((myMemberships ?? []).map((m) => [m.pool_id, m.role]));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">My pools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Circles you&rsquo;re a member of — active, upcoming, and completed.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pools/new">New pool</Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-ajo-danger">Couldn&rsquo;t load your pools: {error.message}</p>
      )}

      {!error && (!pools || pools.length === 0) && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display text-xl text-foreground">No circles yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Start a pool and invite people you trust, or ask an admin to add you to theirs.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/pools/new">Start a pool</Link>
          </Button>
        </div>
      )}

      {pools && pools.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <PoolCard
              key={pool.id}
              id={pool.id}
              name={pool.name}
              status={pool.status}
              contributionAmount={pool.contribution_amount}
              currency={pool.currency}
              frequency={pool.frequency}
              memberCount={pool.member_count?.[0]?.count ?? 0}
              maxMembers={pool.max_members}
              startDate={pool.start_date}
              isAdmin={roleByPool.get(pool.id) === "admin"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
