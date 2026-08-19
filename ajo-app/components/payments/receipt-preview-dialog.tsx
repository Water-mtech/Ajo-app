"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ReceiptPreviewDialog({ receiptPath, label }: { receiptPath: string; label: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isPdf = receiptPath.toLowerCase().endsWith(".pdf");

  async function loadPreview() {
    if (signedUrl) return;
    setIsLoading(true);
    const supabase = createClient();
    // Storage RLS ("Uploader can view own" / "Admins can view their
    // pool's receipt files", sql/001) gates this the same way it would
    // gate a direct download — a non-admin, non-uploader gets an error.
    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(receiptPath, 120);
    setIsLoading(false);
    if (!error && data) setSignedUrl(data.signedUrl);
  }

  return (
    <Dialog onOpenChange={(open) => open && loadPreview()}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && signedUrl && isPdf && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-border p-6 text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Open PDF in a new tab
          </a>
        )}

        {!isLoading && signedUrl && !isPdf && (
          // eslint-disable-next-line @next/next/no-img-element -- signed
          // URL host is dynamic per-file; not worth a next/image config.
          <img
            src={signedUrl}
            alt={`Receipt — ${label}`}
            className="max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}

        {!isLoading && !signedUrl && (
          <p className="py-8 text-center text-sm text-ajo-danger">Couldn&rsquo;t load this file.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
