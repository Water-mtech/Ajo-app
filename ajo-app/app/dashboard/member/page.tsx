import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ReceiptStatusBadge } from "@/components/payments/receipt-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My overview — Ajo" };

type PoolSummary = {
  id: string;
  name: string;
  status: "pending" | "active" | "completed" | "cancelled";
  contribution_amount: number;
  currency: string;
  frequency: string;
  current_cycle: number;
};

type Membership = {
  id: string;
  payout_position: number | null;
  has_packed: boolean;
  ajo_pools: PoolSummary | null;
};

type HistoryRow = {
  id: string;
  cycle_number: number;
  amount: number;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  ajo_pools: { name: string; currency: string } | null;
};

export default async function MemberOverviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membershipsData } = await supabase
    .from("pool_members")
    .select(
      "id, payout_position, has_packed, ajo_pools(id, name, status, contribution_amount, currency, frequency, current_cycle)"
    )
    .eq("user_id", user!.id);

  const { data: historyData } = await supabase
    .from("payment_receipts")
    .select("id, cycle_number, amount, status, submitted_at, ajo_pools(name, currency)")
    .eq("member_id", user!.id)
    .order("submitted_at", { ascending: false })
    .limit(25);

  const memberships = (membershipsData ?? []) as unknown as Membership[];
  const history = (historyData ?? []) as unknown as HistoryRow[];

  const activeMemberships = memberships.filter((m) => m.ajo_pools?.status === "active");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl text-foreground">My overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your circles, at a glance.</p>
      </div>

      {activeMemberships.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display text-xl text-foreground">No active circles yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Join a pool or ask an admin to add you — active contributions will show up here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard/my-pools">Browse my pools</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeMemberships.map((m) => {
            const pool = m.ajo_pools!;
            return (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-lg border border-border bg-card p-5"
              >
                <div>
                  <h3 className="font-display text-lg text-foreground">{pool.name}</h3>
                  <p className="mt-1 font-mono text-sm text-foreground">
                    {formatCurrency(pool.contribution_amount, pool.currency)}{" "}
                    <span className="text-muted-foreground">/ {pool.frequency}</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Cycle {pool.current_cycle} · Queue position {m.payout_position ?? "—"}
                  </p>
                  <p className="mt-1 text-xs">
                    {m.has_packed ? (
                      <span className="font-medium text-ajo-success">🎉 You&rsquo;ve packed</span>
                    ) : (
                      <span className="text-muted-foreground">Not yet packed</span>
                    )}
                  </p>
                </div>
                <Button asChild size="sm" className="mt-4">
                  <Link href={`/dashboard/pools/${pool.id}/pay`}>Upload a receipt</Link>
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl text-foreground">Payment history</h2>
        {history.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing submitted yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Pool</th>
                  <th className="px-4 py-3 font-medium">Cycle</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {history.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-foreground">{r.ajo_pools?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.cycle_number}</td>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {formatCurrency(r.amount, r.ajo_pools?.currency ?? "NGN")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(r.submitted_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ReceiptStatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
