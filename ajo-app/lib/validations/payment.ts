import { z } from "zod";

export const submitReceiptSchema = z.object({
  poolId: z.string().uuid(),
  cycleNumber: z.coerce.number().int().min(1, "Pick a cycle"),
  receiptPath: z.string().min(1, "Upload a receipt first"),
});
export type SubmitReceiptInput = z.infer<typeof submitReceiptSchema>;

export const bankDetailsSchema = z.object({
  bankName: z.string().min(2, "Enter the bank name").max(100),
  accountName: z.string().min(2, "Enter the account name").max(100),
  accountNumber: z.string().min(4, "Enter the account number").max(34),
  paymentInstructions: z.string().max(280, "Keep it under 280 characters").optional().or(z.literal("")),
});
export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;
