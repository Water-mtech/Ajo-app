import { ReceiptStatusBadge } from "@/components/payments/receipt-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";

type Receipt = {
  id: string;
  cycle_number: number;
  amount: number;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
};

export function ReceiptHistory({ receipts, currency }: { receipts: Receipt[]; currency: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Your payments
      </p>
      {receipts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nothing submitted yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="text-foreground">Cycle {r.cycle_number}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatCurrency(r.amount, currency)} · {formatDate(r.submitted_at)}
                </p>
              </div>
              <ReceiptStatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
