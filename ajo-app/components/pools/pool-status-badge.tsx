import { Badge } from "@/components/ui/badge";

type PoolStatus = "pending" | "active" | "completed" | "cancelled";

const STATUS_MAP: Record<PoolStatus, { label: string; className: string }> = {
  pending: { label: "Upcoming", className: "bg-accent text-accent-foreground border-primary/30" },
  active: {
    label: "Active",
    className: "bg-ajo-success/15 text-ajo-success border-ajo-success/30",
  },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: {
    label: "Cancelled",
    className: "bg-ajo-danger/15 text-ajo-danger border-ajo-danger/30",
  },
};

export function PoolStatusBadge({ status }: { status: PoolStatus }) {
  const { label, className } = STATUS_MAP[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
