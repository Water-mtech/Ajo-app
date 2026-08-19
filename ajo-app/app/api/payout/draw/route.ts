import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { drawPayoutSchema } from "@/lib/validations/payout";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = drawPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "poolId is required" }, { status: 400 });
  }

  const { data: payout, error } = await supabase.rpc("trigger_random_payout", {
    p_pool_id: parsed.data.poolId,
  });

  if (error) {
    // trigger_random_payout() raises plain Postgres exceptions rather
    // than structured error codes, so this is a pragmatic message-based
    // split: authorization failures are 403, everything else (already
    // completed, nobody eligible yet, race lost to another draw) is a
    // 409 conflict rather than a 500 — none of these are server bugs.
    const status = error.message.startsWith("Only the pool admin") ? 403 : 409;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (!payout) {
    return NextResponse.json({ error: "Draw failed unexpectedly" }, { status: 500 });
  }

  const { data: winner } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", payout.recipient_id)
    .single();

  return NextResponse.json({ payout, winnerName: winner?.full_name ?? "A member" }, { status: 200 });
}
