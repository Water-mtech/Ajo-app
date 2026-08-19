"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { bankDetailsSchema, type BankDetailsInput } from "@/lib/validations/payment";
import { updateBankDetails } from "@/app/dashboard/actions/payments";

type BankDetailsEditorProps = {
  poolId: string;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  instructions: string | null;
};

export function BankDetailsEditor({
  poolId,
  bankName,
  accountName,
  accountNumber,
  instructions,
}: BankDetailsEditorProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<BankDetailsInput>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: bankName ?? "",
      accountName: accountName ?? "",
      accountNumber: accountNumber ?? "",
      paymentInstructions: instructions ?? "",
    },
  });

  function onSubmit(values: BankDetailsInput) {
    startTransition(async () => {
      const { error } = await updateBankDetails(poolId, values);
      if (error) {
        toast.error("Couldn't save", { description: error });
        return;
      }
      toast.success("Payment details updated");
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank name</FormLabel>
                <FormControl>
                  <Input placeholder="GTBank" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account number</FormLabel>
                <FormControl>
                  <Input className="font-mono" placeholder="0123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="accountName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account name</FormLabel>
              <FormControl>
                <Input placeholder="Ajo Circle Ltd" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paymentInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes for members (optional)</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Use your full name as the transfer narration." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save payment details"}
        </Button>
      </form>
    </Form>
  );
}
