import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden="true" />}
      </div>
      <p className="mt-2 truncate font-mono text-2xl text-foreground">{value}</p>
      {caption && <p className="mt-1 text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
