import type { Metadata } from "next";
import { PoolCreationForm } from "@/components/pools/pool-creation-form";

export const metadata: Metadata = { title: "New pool — Ajo" };

export default function NewPoolPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl text-foreground">Start a new circle</h1>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        You&rsquo;ll be the admin — you can add members right after this.
      </p>
      <PoolCreationForm />
    </div>
  );
}
