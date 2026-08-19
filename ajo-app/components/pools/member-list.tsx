type Member = {
  id: string;
  user_id: string;
  role: "admin" | "member";
  status: "invited" | "active" | "removed" | "completed";
  payout_position: number | null;
  has_packed?: boolean;
  profiles: { full_name: string; phone: string | null } | null;
};

export function MemberList({ members }: { members: Member[] }) {
  if (members.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No members yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {members.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-mono text-xs text-accent-foreground">
              {m.payout_position ?? "—"}
            </span>
            <div>
              <p className="text-sm text-foreground">{m.profiles?.full_name ?? "Member"}</p>
              {m.profiles?.phone && (
                <p className="font-mono text-xs text-muted-foreground">{m.profiles.phone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {m.role === "admin" && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                Admin
              </span>
            )}
            {m.has_packed && (
              <span className="rounded-full bg-ajo-success/15 px-2 py-0.5 font-medium text-ajo-success">
                Packed
              </span>
            )}
            <span className="capitalize text-muted-foreground">{m.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
