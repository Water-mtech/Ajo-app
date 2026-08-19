type BankDetailsCardProps = {
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  instructions: string | null;
};

export function BankDetailsCard({
  bankName,
  accountName,
  accountNumber,
  instructions,
}: BankDetailsCardProps) {
  if (!bankName || !accountName || !accountNumber) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        The pool admin hasn&rsquo;t added bank transfer details yet — check back before sending a
        payment.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Send your contribution to
      </p>
      <dl className="space-y-2 text-sm">
        <Row label="Bank" value={bankName} />
        <Row label="Account name" value={accountName} />
        <Row label="Account number" value={accountNumber} mono />
      </dl>
      {instructions && <p className="mt-3 text-xs text-muted-foreground">{instructions}</p>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono tracking-wide text-foreground" : "text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
