"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { submitReceiptSchema, bankDetailsSchema } from "@/lib/validations/payment";

type ActionResult<T = null> = { data: T | null; error: string | null };

export async function submitPaymentReceipt(
  values: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitReceiptSchema.safeParse(values);
  if (!parsed.success) return { data: null, error: "Check the form and try again." };

  const { poolId, cycleNumber, receiptPath } = parsed.data;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "You need to be signed in." };

  // Never trust a client-supplied amount — always read it from the pool
  // itself, so a receipt can't be submitted claiming the wrong figure.
  const { data: pool, error: poolError } = await supabase
    .from("ajo_pools")
    .select("contribution_amount")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) return { data: null, error: "Couldn't find that pool." };

  const { data, error } = await supabase
    .from("payment_receipts")
    .insert({
      pool_id: poolId,
      member_id: user.id,
      cycle_number: cycleNumber,
      amount: pool.contribution_amount,
      // receipt_url stores the Storage object path, not a public URL —
      // the bucket is private, so viewers get a short-lived signed URL.
      receipt_url: receiptPath,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}/pay`);
  revalidatePath(`/dashboard/pools/${poolId}/admin/approvals`);
  return { data: { id: data.id }, error: null };
}

export async function updateBankDetails(poolId: string, values: unknown): Promise<ActionResult> {
  const parsed = bankDetailsSchema.safeParse(values);
  if (!parsed.success) return { data: null, error: "Check the highlighted fields." };

  const { bankName, accountName, accountNumber, paymentInstructions } = parsed.data;
  const supabase = createClient();

  // Relies entirely on the "Admins can update their pools" RLS policy —
  // a non-admin's update matches zero rows rather than needing an
  // explicit role check here.
  const { error } = await supabase
    .from("ajo_pools")
    .update({
      bank_name: bankName,
      account_name: accountName,
      account_number: accountNumber,
      payment_instructions: paymentInstructions || null,
    })
    .eq("id", poolId);

  if (error) return { data: null, error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}`);
  revalidatePath(`/dashboard/pools/${poolId}/pay`);
  return { data: null, error: null };
}

export async function reviewPaymentReceipt(
  receiptId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "You need to be signed in." };

  // .eq("status", "pending") is a race guard: if two admins click
  // Approve/Reject on the same receipt at once, only the first succeeds
  // and the second gets a clean "already reviewed" instead of silently
  // overwriting the decision.
  const { data, error } = await supabase
    .from("payment_receipts")
    .update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", receiptId)
    .eq("status", "pending")
    .select("id, pool_id")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "This receipt was already reviewed." };
  }

  revalidatePath(`/dashboard/pools/${data.pool_id}/admin/approvals`);
  return { data: null, error: null };
}
