import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ApprovalsTable, type LedgerReceipt } from "@/components/payments/approvals-table";

export const metadata: Metadata = { title: "Approvals — Ajo" };

export default async function ApprovalsPage({ params }: { params: { poolId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pool } = await supabase
    .from("ajo_pools")
    .select("id, name, currency")
    .eq("id", params.poolId)
    .single();

  if (!pool) notFound();

  // Same admin definition the RLS helper is_pool_admin() uses — checked
  // here purely to redirect non-admins to a friendlier page; the RLS
  // policies underneath are the actual enforcement.
  const { data: membership } = await supabase
    .from("pool_members")
    .select("role")
    .eq("pool_id", params.poolId)
    .eq("user_id", user!.id)
    .single();

  if (membership?.role !== "admin") redirect(`/dashboard/pools/${params.poolId}`);

  const { data: receipts } = await supabase
    .from("payment_receipts")
    .select("id, cycle_number, amount, receipt_url, status, submitted_at, profiles(full_name)")
    .eq("pool_id", params.poolId)
    .order("submitted_at", { ascending: false });

  const initialReceipts: LedgerReceipt[] = (receipts ?? []).map((r) => ({
    id: r.id,
    cycle_number: r.cycle_number,
    amount: r.amount,
    receipt_url: r.receipt_url,
    status: r.status,
    submitted_at: r.submitted_at,
    member_name: (r.profiles as { full_name: string } | null)?.full_name ?? "Member",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">{pool.name} — review submitted receipts.</p>
      </div>
      <ApprovalsTable poolId={pool.id} currency={pool.currency} initialReceipts={initialReceipts} />
    </div>
  );
}
