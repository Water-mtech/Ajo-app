import Link from "next/link";
import { PoolStatusBadge } from "@/components/pools/pool-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";

type PoolCardProps = {
  id: string;
  name: string;
  status: "pending" | "active" | "completed" | "cancelled";
  contributionAmount: number;
  currency: string;
  frequency: string;
  memberCount: number;
  maxMembers: number;
  startDate: string | null;
  isAdmin: boolean;
};

export function PoolCard(props: PoolCardProps) {
  const {
    id,
    name,
    status,
    contributionAmount,
    currency,
    frequency,
    memberCount,
    maxMembers,
    startDate,
    isAdmin,
  } = props;

  return (
    <Link
      href={`/dashboard/pools/${id}`}
      className="group flex flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-snug text-foreground">{name}</h3>
          <PoolStatusBadge status={status} />
        </div>
        <p className="font-mono text-sm text-foreground">
          {formatCurrency(contributionAmount, currency)}{" "}
          <span className="text-muted-foreground">/ {frequency}</span>
        </p>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <div className="text-xs text-muted-foreground">
          <div>
            {memberCount}/{maxMembers} members
          </div>
          {startDate && <div>Starts {formatDate(startDate)}</div>}
        </div>
        {isAdmin && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Admin
          </span>
        )}
      </div>
    </Link>
  );
}
