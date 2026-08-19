import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BankDetailsCard } from "@/components/payments/bank-details-card";
import { ReceiptUploadForm } from "@/components/payments/receipt-upload-form";
import { ReceiptHistory } from "@/components/payments/receipt-history";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Make a payment — Ajo" };

export default async function PayPage({ params }: { params: { poolId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS ("Members can view their pools") returns null if the signed-in
  // user isn't a member of this pool.
  const { data: pool } = await supabase
    .from("ajo_pools")
    .select(
      "id, name, contribution_amount, currency, frequency, max_members, bank_name, account_name, account_number, payment_instructions"
    )
    .eq("id", params.poolId)
    .single();

  if (!pool) notFound();

  const { data: myReceipts } = await supabase
    .from("payment_receipts")
    .select("id, cycle_number, amount, status, submitted_at")
    .eq("pool_id", params.poolId)
    .eq("member_id", user!.id)
    .order("cycle_number", { ascending: true });

  // Suggest the next cycle this member hasn't already paid or claimed —
  // rejected receipts free the slot back up.
  const claimedCycles = new Set(
    (myReceipts ?? []).filter((r) => r.status !== "rejected").map((r) => r.cycle_number)
  );
  let suggestedCycle = 1;
  while (claimedCycles.has(suggestedCycle) && suggestedCycle < pool.max_members) {
    suggestedCycle++;
  }

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <div>
        <h1 className="font-display text-3xl text-foreground">{pool.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatCurrency(pool.contribution_amount, pool.currency)} due every {pool.frequency}{" "}
          cycle.
        </p>
      </div>

      <BankDetailsCard
        bankName={pool.bank_name}
        accountName={pool.account_name}
        accountNumber={pool.account_number}
        instructions={pool.payment_instructions}
      />

      <ReceiptUploadForm
        poolId={pool.id}
        maxMembers={pool.max_members}
        suggestedCycle={suggestedCycle}
        amount={pool.contribution_amount}
        currency={pool.currency}
      />

      <ReceiptHistory receipts={myReceipts ?? []} currency={pool.currency} />
    </div>
  );
}
