import type { ReactNode } from "react";
import { RotationRing } from "@/components/auth/rotation-ring";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel — the "why", shown only from lg up */}
      <div className="relative hidden overflow-hidden bg-ink px-12 py-16 text-paper lg:flex lg:flex-col lg:justify-between">
        <span className="font-display text-2xl italic text-gold">Ajo</span>

        <div className="flex flex-1 items-center justify-center py-12">
          <RotationRing size={340} memberCount={8} activeIndex={2} />
        </div>

        <div className="max-w-sm">
          <p className="font-display text-3xl leading-tight text-paper">
            Everyone contributes.
            <br />
            <span className="italic text-gold">Everyone gets a turn.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#8B93A7]">
            Ajo keeps your contribution circle honest — every payment logged, every payout
            tracked, every member&rsquo;s turn accounted for.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center bg-background px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-display text-xl italic text-primary">Ajo</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
