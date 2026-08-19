import { z } from "zod";

export const poolFrequencyValues = ["weekly", "monthly"] as const;

export const createPoolSchema = z.object({
  name: z.string().min(3, "Give your pool a name").max(80, "Keep it under 80 characters"),
  description: z.string().max(280, "Keep it under 280 characters").optional().or(z.literal("")),
  contributionAmount: z.coerce
    .number({ invalid_type_error: "Enter an amount" })
    .positive("Must be greater than 0"),
  currency: z.string().min(3).max(3),
  frequency: z.enum(poolFrequencyValues),
  maxMembers: z.coerce
    .number({ invalid_type_error: "Enter a number" })
    .int("Whole numbers only")
    .min(2, "At least 2 members")
    .max(100, "Keep it under 100 members"),
  startDate: z.string().min(1, "Pick a start date"),
});
export type CreatePoolInput = z.infer<typeof createPoolSchema>;

// Which fields belong to which step, so we only validate what's visible
// before letting the wizard advance.
export const STEP_FIELDS: Record<number, (keyof CreatePoolInput)[]> = {
  0: ["name", "description"],
  1: ["contributionAmount", "currency", "frequency"],
  2: ["maxMembers", "startDate"],
  3: [],
};

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const inviteQuerySchema = z.object({
  query: z
    .string()
    .min(3, "Enter an email or phone number")
    .refine(
      (v) => E164.test(v) || EMAIL.test(v),
      "Enter a full email, or a phone number like +2348012345678"
    ),
});
export type InviteQueryInput = z.infer<typeof inviteQuerySchema>;
