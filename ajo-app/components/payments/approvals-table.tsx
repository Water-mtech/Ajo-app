"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptStatusBadge } from "@/components/payments/receipt-status-badge";
import { ReceiptPreviewDialog } from "@/components/payments/receipt-preview-dialog";

import { createClient } from "@/lib/supabase/client";
import { reviewPaymentReceipt } from "@/app/dashboard/actions/payments";
import { formatCurrency, formatDate } from "@/lib/format";

export type LedgerReceipt = {
  id: string;
  cycle_number: number;
  amount: number;
  receipt_url: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  member_name: string;
};

type Tab = "pending" | "approved" | "rejected" | "all";

export function ApprovalsTable({
  poolId,
  currency,
  initialReceipts,
}: {
  poolId: string;
  currency: string;
  initialReceipts: LedgerReceipt[];
}) {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [tab, setTab] = useState<Tab>("pending");
  const [pendingAction, startAction] = useTransition();
  const knownIds = useRef(new Set(initialReceipts.map((r) => r.id)));

  // Live sync: any admin's decision, or a member submitting a new
  // receipt, updates every open ledger for this pool without a refresh.
  // Requires payment_receipts to be added to the supabase_realtime
  // publication (sql/004) — delivery still respects RLS per-row.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`payment_receipts:${poolId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_receipts", filter: `pool_id=eq.${poolId}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            knownIds.current.delete(id);
            setReceipts((prev) => prev.filter((r) => r.id !== id));
            return;
          }

          const row = payload.new as Record<string, unknown>;
          const id = row.id as string;

          if (knownIds.current.has(id)) {
            setReceipts((prev) =>
              prev.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: row.status as LedgerReceipt["status"],
                      cycle_number: row.cycle_number as number,
                      amount: row.amount as number,
                      receipt_url: row.receipt_url as string,
                    }
                  : r
              )
            );
            return;
          }

          // Brand-new receipt — postgres_changes payloads carry raw
          // columns only, so fetch the member's name once before adding it.
          knownIds.current.add(id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", row.member_id as string)
            .single();

          setReceipts((prev) => [
            {
              id,
              cycle_number: row.cycle_number as number,
              amount: row.amount as number,
              receipt_url: row.receipt_url as string,
              status: row.status as LedgerReceipt["status"],
              submitted_at: row.submitted_at as string,
              member_name: profile?.full_name ?? "Member",
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poolId]);

  function onDecision(id: string, decision: "approved" | "rejected") {
    startAction(async () => {
      const { error } = await reviewPaymentReceipt(id, decision);
      if (error) {
        toast.error("Couldn't update that receipt", { description: error });
        return;
      }
      // Optimistic — the realtime event above confirms it a moment later.
      setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, status: decision } : r)));
      toast.success(decision === "approved" ? "Receipt approved" : "Receipt rejected");
    });
  }

  const filtered = receipts.filter((r) => tab === "all" || r.status === tab);
  const pendingCount = receipts.filter((r) => r.status === "pending").length;

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
      <TabsList>
        <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
        <TabsTrigger value="approved">Approved</TabsTrigger>
        <TabsTrigger value="rejected">Rejected</TabsTrigger>
        <TabsTrigger value="all">All</TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="mt-4">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing here.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Cycle</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-foreground">{r.member_name}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.cycle_number}</td>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {formatCurrency(r.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <ReceiptStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ReceiptPreviewDialog
                        receiptPath={r.receipt_url}
                        label={`${r.member_name} — Cycle ${r.cycle_number}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={pendingAction}
                            onClick={() => onDecision(r.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-ajo-danger hover:text-ajo-danger"
                            disabled={pendingAction}
                            onClick={() => onDecision(r.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
