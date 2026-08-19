"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPoolSchema, inviteQuerySchema } from "@/lib/validations/pool";

type ActionResult<T = null> = { data: T | null; error: string | null };

type SearchResult = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

export async function createPool(values: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createPoolSchema.safeParse(values);
  if (!parsed.success) return { data: null, error: "Check the highlighted fields." };

  const { name, description, contributionAmount, currency, frequency, maxMembers, startDate } =
    parsed.data;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_ajo_pool", {
    p_name: name,
    p_description: description || null,
    p_contribution_amount: contributionAmount,
    p_currency: currency,
    p_frequency: frequency,
    p_max_members: maxMembers,
    p_start_date: startDate,
  });

  if (error) return { data: null, error: error.message };

  revalidatePath("/dashboard/my-pools");
  return { data: { id: (data as { id: string }).id }, error: null };
}

export async function searchUsersForInvite(
  values: unknown
): Promise<ActionResult<SearchResult[]> & { data: SearchResult[] }> {
  const parsed = inviteQuerySchema.safeParse(values);
  if (!parsed.success) return { data: [], error: "Enter a full email or phone number." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_users_for_invite", {
    p_query: parsed.data.query.trim(),
  });

  if (error) return { data: [], error: error.message };
  return { data: (data as SearchResult[]) ?? [], error: null };
}

export async function addPoolMember(poolId: string, userId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc("add_pool_member", {
    p_pool_id: poolId,
    p_user_id: userId,
  });

  if (error) return { data: null, error: error.message };

  revalidatePath(`/dashboard/pools/${poolId}`);
  return { data: null, error: null };
}
