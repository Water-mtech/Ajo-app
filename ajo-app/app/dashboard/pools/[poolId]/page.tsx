import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PoolStatusBadge } from "@/components/pools/pool-status-badge";
import { MemberList } from "@/components/pools/member-list";
import { MemberSearch } from "@/components/pools/member-search";
import { BankDetailsEditor } from "@/components/payments/bank-details-editor";
import { DrawPayoutButton } from "@/components/payouts/draw-payout-button";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Pool — Ajo" };

type PoolMemberRow = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  status: "invited" | "active" | "removed" | "completed";
  payout_position: number | null;
  has_packed: boolean;
  profiles: { full_name: string; phone: string | null } | null;
};

export default async function PoolDetailPage({ params }: { params: { poolId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS ("Members can view their pools") returns null here if the
  // signed-in user isn't a member — that's what powers the notFound().
  const { data: pool } = await supabase
    .from("ajo_pools")
    .select("*")
    .eq("id", params.poolId)
    .single();

  if (!pool) notFound();

  const { data: membersData } = await supabase
    .from("pool_members")
    .select("id, user_id, role, status, payout_position, has_packed, profiles(full_name, phone)")
    .eq("pool_id", params.poolId)
    .order("payout_position", { ascending: true, nullsFirst: false });

  // Without generated Supabase types, a foreign-table embed like
  // profiles(...) gets inferred with array cardinality by default (it
  // has no way to know the FK is actually many-to-one). Going through
  // `unknown` first tells TypeScript to trust the real runtime shape —
  // a single object per row — instead of fighting its own inference.
  const members = (membersData ?? []) as unknown as PoolMemberRow[];

  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === "admin";

  let eligibleCount = 0;
  if (isAdmin && (pool.status === "pending" || pool.status === "active")) {
    const notYetPacked = (members ?? []).filter((m) => m.status === "active" && !m.has_packed);
    if (notYetPacked.length > 0) {
      const { count } = await supabase
        .from("payment_receipts")
        .select("id", { count: "exact", head: true })
        .eq("pool_id", params.poolId)
        .eq("cycle_number", pool.current_cycle)
        .eq("status", "approved")
        .in(
          "member_id",
          notYetPacked.map((m) => m.user_id)
        );
      eligibleCount = count ?? 0;
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-foreground">{pool.name}</h1>
            {pool.description && (
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">{pool.description}</p>
            )}
          </div>
          <PoolStatusBadge status={pool.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Contribution</dt>
            <dd className="font-mono text-foreground">
              {formatCurrency(pool.contribution_amount, pool.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Frequency</dt>
            <dd className="capitalize text-foreground">{pool.frequency}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Capacity</dt>
            <dd className="font-mono text-foreground">
              {members?.length ?? 0}/{pool.max_members}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Starts</dt>
            <dd className="text-foreground">
              {pool.start_date ? formatDate(pool.start_date) : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-3">
          <Button asChild>
            <Link href={`/dashboard/pools/${pool.id}/pay`}>Make a payment</Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/pools/${pool.id}/admin/approvals`}>Review payments</Link>
            </Button>
          )}
        </div>
      </div>

      {isAdmin && (
        <section>
          <h2 className="mb-3 font-display text-xl text-foreground">Payment details</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Shown to members on the payment page so they know where to send their contribution.
          </p>
          <BankDetailsEditor
            poolId={pool.id}
            bankName={pool.bank_name}
            accountName={pool.account_name}
            accountNumber={pool.account_number}
            instructions={pool.payment_instructions}
          />
        </section>
      )}

      {isAdmin && (pool.status === "pending" || pool.status === "active") && (
        <section>
          <h2 className="mb-3 font-display text-xl text-foreground">Payout draw</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div className="text-sm">
              <p className="text-foreground">
                Cycle <span className="font-mono">{pool.current_cycle}</span>
              </p>
              <p className="text-muted-foreground">
                {eligibleCount} member{eligibleCount === 1 ? "" : "s"} paid and eligible to be
                drawn this cycle.
              </p>
            </div>
            <DrawPayoutButton poolId={pool.id} />
          </div>
        </section>
      )}

      {isAdmin && (
        <section>
          <h2 className="mb-3 font-display text-xl text-foreground">Add a member</h2>
          <MemberSearch poolId={pool.id} existingUserIds={(members ?? []).map((m) => m.user_id)} />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl text-foreground">Members</h2>
        <MemberList members={members ?? []} />
      </section>
    </div>
  );
}
