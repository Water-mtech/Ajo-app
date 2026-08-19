"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  emailSignInSchema,
  emailSignUpSchema,
  phoneRequestSchema,
  phoneVerifySchema,
} from "@/lib/validations/auth";

type ActionResult = { error: string | null };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function signInWithEmail(values: unknown): Promise<ActionResult> {
  const parsed = emailSignInSchema.safeParse(values);
  if (!parsed.success) return { error: "Check the highlighted fields." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  return { error: error?.message ?? null };
}

export async function signUpWithEmail(values: unknown): Promise<ActionResult> {
  const parsed = emailSignUpSchema.safeParse(values);
  if (!parsed.success) return { error: "Check the highlighted fields." };

  const { fullName, email, password } = parsed.data;
  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  return { error: error?.message ?? null };
}

export async function requestPhoneOtp(
  values: unknown,
  mode: "signin" | "signup"
): Promise<ActionResult> {
  const parsed = phoneRequestSchema.safeParse(values);
  if (!parsed.success) return { error: "Enter a valid phone number." };

  const { phone, fullName } = parsed.data;
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      // Sign-in should never silently create a new account; sign-up should.
      shouldCreateUser: mode === "signup",
      data: mode === "signup" ? { full_name: fullName } : undefined,
    },
  });

  return { error: error?.message ?? null };
}

export async function verifyPhoneOtp(values: unknown): Promise<ActionResult> {
  const parsed = phoneVerifySchema.safeParse(values);
  if (!parsed.success) return { error: "Enter the 6-digit code." };

  const { phone, token } = parsed.data;
  const supabase = createClient();

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
