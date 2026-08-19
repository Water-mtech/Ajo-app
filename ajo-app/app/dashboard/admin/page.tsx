import type { Metadata } from "next";
import { CalendarClock, ClipboardCheck, Coins, PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/admin/metric-card";
import { ComplianceChart, type CompliancePoint } from "@/components/admin/compliance-chart";
import { formatCurrency, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Admin overview — Ajo" };

type DashboardStats = {
  active_pools: number;
  pending_approvals: number;
  liquidity_by_currency: { currency: string; amount: number }[];
  next_draw_date: string | null;
};

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [{ data: statsData }, { data: complianceData }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.rpc("admin_pool_compliance"),
  ]);

  const stats: DashboardStats = (statsData as DashboardStats) ?? {
    active_pools: 0,
    pending_approvals: 0,
    liquidity_by_currency: [],
    next_draw_date: null,
  };
  const compliance = (complianceData ?? []) as CompliancePoint[];

  const liquidityLabel =
    stats.liquidity_by_currency.length === 0
      ? "—"
      : stats.liquidity_by_currency.map((l) => formatCurrency(l.amount, l.currency)).join(" · ");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-foreground">Admin overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Across every pool you administer.</p>
      </div>

      {stats.active_pools === 0 && stats.pending_approvals === 0 && compliance.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display text-xl text-foreground">Nothing to manage yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Once you create a pool and members start paying in, its numbers will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total liquidity"
              value={liquidityLabel}
              icon={Coins}
              caption="Collected minus paid out"
            />
            <MetricCard label="Active pools" value={String(stats.active_pools)} icon={PiggyBank} />
            <MetricCard
              label="Pending approvals"
              value={String(stats.pending_approvals)}
              icon={ClipboardCheck}
            />
            <MetricCard
              label="Next estimated draw"
              value={stats.next_draw_date ? formatDate(stats.next_draw_date) : "—"}
              icon={CalendarClock}
              caption="Projected from cycle cadence"
            />
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl text-foreground">Member compliance rate</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Share of active members who&rsquo;ve paid the current cycle, per pool.
            </p>
            <ComplianceChart data={compliance} />
          </div>
        </>
      )}
    </div>
  );
}
