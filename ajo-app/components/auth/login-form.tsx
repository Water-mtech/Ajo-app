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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  emailSignInSchema,
  type EmailSignInInput,
  phoneRequestSchema,
  type PhoneRequestInput,
  phoneVerifySchema,
  type PhoneVerifyInput,
} from "@/lib/validations/auth";
import { requestPhoneOtp, signInWithEmail, verifyPhoneOtp } from "@/app/actions/auth";

export function LoginForm() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to check your pools and payout schedule.
        </p>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-6">
          <EmailSignInForm />
        </TabsContent>
        <TabsContent value="phone" className="mt-6">
          <PhoneSignInForm />
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        New to Ajo?{" "}
        <a href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </a>
      </p>
    </div>
  );
}

function EmailSignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EmailSignInInput>({
    resolver: zodResolver(emailSignInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: EmailSignInInput) {
    startTransition(async () => {
      const { error } = await signInWithEmail(values);
      if (error) {
        toast.error("Couldn't sign you in", { description: error });
        return;
      }
      toast.success("Welcome back");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <a
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </a>
              </div>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}

function PhoneSignInForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  const requestForm = useForm<PhoneRequestInput>({
    resolver: zodResolver(phoneRequestSchema),
    defaultValues: { phone: "" },
  });

  const verifyForm = useForm<PhoneVerifyInput>({
    resolver: zodResolver(phoneVerifySchema),
    defaultValues: { phone: "", token: "" },
  });

  function onRequestOtp(values: PhoneRequestInput) {
    startTransition(async () => {
      const { error } = await requestPhoneOtp(values, "signin");
      if (error) {
        toast.error("Couldn't send code", { description: error });
        return;
      }
      setPhone(values.phone);
      verifyForm.setValue("phone", values.phone);
      setStage("verify");
      toast.success("Code sent", { description: `We texted a 6-digit code to ${values.phone}` });
    });
  }

  function onVerifyOtp(values: PhoneVerifyInput) {
    startTransition(async () => {
      const { error } = await verifyPhoneOtp(values);
      if (error) {
        toast.error("That code didn't work", { description: error });
        return;
      }
      toast.success("Welcome back");
      router.push("/");
      router.refresh();
    });
  }

  if (stage === "request") {
    return (
      <Form {...requestForm}>
        <form onSubmit={requestForm.handleSubmit(onRequestOtp)} className="space-y-4">
          <FormField
            control={requestForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+2348012345678"
                    autoComplete="tel"
                    className="font-mono"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Sending code…" : "Send code"}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <Form {...verifyForm}>
      <form onSubmit={verifyForm.handleSubmit(onVerifyOtp)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the code sent to <span className="font-mono text-foreground">{phone}</span>
        </p>
        <FormField
          control={verifyForm.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>6-digit code</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="font-mono tracking-[0.5em]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Verifying…" : "Verify and sign in"}
        </Button>
        <button
          type="button"
          onClick={() => setStage("request")}
          className="w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          Use a different number
        </button>
      </form>
    </Form>
  );
}
