"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";

const CONFETTI_COLORS = ["#D4A64A", "#E8C878", "#4FAE7C"];

export function DrawPayoutButton({ poolId }: { poolId: string }) {
  const router = useRouter();
  const [isDrawing, setIsDrawing] = useState(false);

  async function handleDraw() {
    setIsDrawing(true);
    try {
      const res = await fetch("/api/payout/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error("Couldn't draw a winner", { description: body.error });
        return;
      }

      fireConfetti();
      toast.success(`${body.winnerName} packed this cycle! 🎉`, {
        description: "The payout has been logged.",
      });
      router.refresh();
    } catch {
      toast.error("Something went wrong", { description: "Try again in a moment." });
    } finally {
      setIsDrawing(false);
    }
  }

  return (
    <Button onClick={handleDraw} disabled={isDrawing}>
      {isDrawing ? "Drawing…" : "Draw this cycle's payout"}
    </Button>
  );
}

function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const end = Date.now() + 1400;

  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: CONFETTI_COLORS });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: CONFETTI_COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
