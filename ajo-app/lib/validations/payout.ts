import { z } from "zod";

export const drawPayoutSchema = z.object({
  poolId: z.string().uuid(),
});
export type DrawPayoutInput = z.infer<typeof drawPayoutSchema>;
