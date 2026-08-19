import { Badge } from "@/components/ui/badge";

type ReceiptStatus = "pending" | "approved" | "rejected";

const STATUS_MAP: Record<ReceiptStatus, { label: string; className: string }> = {
  pending: {
    label: "Under review",
    className: "bg-accent text-accent-foreground border-primary/30",
  },
  approved: {
    label: "Approved",
    className: "bg-ajo-success/15 text-ajo-success border-ajo-success/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-ajo-danger/15 text-ajo-danger border-ajo-danger/30",
  },
};

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
