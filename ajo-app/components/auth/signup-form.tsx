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
  emailSignUpSchema,
  type EmailSignUpInput,
  phoneRequestSchema,
  type PhoneRequestInput,
  phoneVerifySchema,
  type PhoneVerifyInput,
} from "@/lib/validations/auth";
import { requestPhoneOtp, signUpWithEmail, verifyPhoneOtp } from "@/app/actions/auth";

export function SignupForm() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-foreground">Start your circle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an account to join or start an Ajo pool.
        </p>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-6">
          <EmailSignUpForm />
        </TabsContent>
        <TabsContent value="phone" className="mt-6">
          <PhoneSignUpForm />
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}

function EmailSignUpForm() {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<EmailSignUpInput>({
    resolver: zodResolver(emailSignUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  function onSubmit(values: EmailSignUpInput) {
    startTransition(async () => {
      const { error } = await signUpWithEmail(values);
      if (error) {
        toast.error("Couldn't create your account", { description: error });
        return;
      }
      setSubmitted(true);
      toast.success("Check your inbox", {
        description: "We sent a confirmation link to finish setting up your account.",
      });
    });
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        We sent a confirmation link to your email. Click it to activate your account, then come
        back and sign in.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Ada Obi" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}

function PhoneSignUpForm() {
  const router = useRouter();
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  const requestForm = useForm<PhoneRequestInput>({
    resolver: zodResolver(phoneRequestSchema),
    defaultValues: { phone: "", fullName: "" },
  });

  const verifyForm = useForm<PhoneVerifyInput>({
    resolver: zodResolver(phoneVerifySchema),
    defaultValues: { phone: "", token: "" },
  });

  function onRequestOtp(values: PhoneRequestInput) {
    startTransition(async () => {
      const { error } = await requestPhoneOtp(values, "signup");
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
      toast.success("Account created");
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
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Ada Obi" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          {isPending ? "Verifying…" : "Verify and create account"}
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
