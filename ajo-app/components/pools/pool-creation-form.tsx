"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StepProgress } from "@/components/pools/step-progress";
import { createPoolSchema, STEP_FIELDS, type CreatePoolInput } from "@/lib/validations/pool";
import { createPool } from "@/app/dashboard/actions/pools";
import { buildCycleSchedule, formatCurrency, formatDate } from "@/lib/format";

const STEPS = ["Basics", "Money", "Structure", "Review"];
const CURRENCIES = ["NGN", "USD", "GHS", "KES"];

export function PoolCreationForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreatePoolInput>({
    resolver: zodResolver(createPoolSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
      // Empty string, not undefined — keeps the number input controlled
      // from the first render; zod's coerce.number() handles the cast.
      contributionAmount: "" as unknown as number,
      currency: "NGN",
      frequency: "monthly",
      maxMembers: 10,
      startDate: "",
    },
  });

  async function goNext() {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 ? true : await form.trigger(fields);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit(values: CreatePoolInput) {
    startTransition(async () => {
      const { data, error } = await createPool(values);
      if (error || !data) {
        toast.error("Couldn't create the pool", { description: error ?? "Try again." });
        return;
      }
      toast.success("Pool created", {
        description: `${values.name} is ready — add your first members.`,
      });
      router.push(`/dashboard/pools/${data.id}`);
    });
  }

  const values = form.watch();

  return (
    <div>
      <StepProgress steps={STEPS} currentStep={step} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pool name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Marina Street Ajo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Who's this circle for, and what's it saving toward?"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional — visible to members you add.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <FormField
                  control={form.control}
                  name="contributionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contribution amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          placeholder="50000"
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-24 font-mono">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-3"
                      >
                        {(["weekly", "monthly"] as const).map((freq) => (
                          <label
                            key={freq}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm capitalize has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
                          >
                            <RadioGroupItem value={freq} />
                            {freq}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="maxMembers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max capacity</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" className="font-mono" {...field} />
                    </FormControl>
                    <FormDescription>
                      One payout slot per member — this sets how many cycles the pool runs.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First cycle starts</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 3 && <ReviewStep values={values} />}

          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <Button type="button" variant="ghost" onClick={goBack} disabled={isPending}>
                Back
              </Button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating pool…" : "Create pool"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

function ReviewStep({ values }: { values: CreatePoolInput }) {
  const schedule =
    values.startDate && values.maxMembers
      ? buildCycleSchedule(values.startDate, values.frequency, Math.min(values.maxMembers, 6))
      : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <dl className="space-y-3 text-sm">
          <Row label="Name" value={values.name || "—"} />
          <Row
            label="Contribution"
            value={
              values.contributionAmount
                ? `${formatCurrency(Number(values.contributionAmount), values.currency)} / ${values.frequency}`
                : "—"
            }
            mono
          />
          <Row label="Capacity" value={`${values.maxMembers || 0} members`} />
          <Row label="Starts" value={values.startDate ? formatDate(values.startDate) : "—"} />
        </dl>
      </div>

      {schedule.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cycle schedule preview
          </p>
          <ol className="space-y-1.5">
            {schedule.map((d, i) => (
              <li key={i} className="flex items-center gap-3 font-mono text-xs">
                <span className="text-foreground">Cycle {i + 1}</span>
                <span className="text-muted-foreground">{formatDate(d)}</span>
              </li>
            ))}
            {values.maxMembers > schedule.length && (
              <li className="text-xs text-muted-foreground">
                …and {values.maxMembers - schedule.length} more, one per member.
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-foreground" : "text-foreground"}>{value}</dd>
    </div>
  );
}
