import { z } from "zod";

export const emailSignInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type EmailSignInInput = z.infer<typeof emailSignInSchema>;

export const emailSignUpSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type EmailSignUpInput = z.infer<typeof emailSignUpSchema>;

// E.164 international format, e.g. +2348012345678
const E164 = /^\+[1-9]\d{7,14}$/;

export const phoneRequestSchema = z.object({
  phone: z.string().regex(E164, "Use international format, e.g. +2348012345678"),
  fullName: z.string().min(2, "Enter your full name").optional(),
});
export type PhoneRequestInput = z.infer<typeof phoneRequestSchema>;

export const phoneVerifySchema = z.object({
  phone: z.string().regex(E164, "Use international format, e.g. +2348012345678"),
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;
