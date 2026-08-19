"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createClient } from "@/lib/supabase/client";
import { submitPaymentReceipt } from "@/app/dashboard/actions/payments";
import { ACCEPTED_RECEIPT_TYPES, buildReceiptStoragePath, validateReceiptFile } from "@/lib/storage";
import { formatCurrency } from "@/lib/format";

type ReceiptUploadFormProps = {
  poolId: string;
  maxMembers: number;
  suggestedCycle: number;
  amount: number;
  currency: string;
};

export function ReceiptUploadForm({
  poolId,
  maxMembers,
  suggestedCycle,
  amount,
  currency,
}: ReceiptUploadFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cycleNumber, setCycleNumber] = useState(String(suggestedCycle));
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUpload] = useTransition();

  function pickFile(candidate: File | undefined) {
    if (!candidate) return;
    const problem = validateReceiptFile(candidate);
    if (problem) {
      toast.error("Can't use that file", { description: problem });
      return;
    }
    setFile(candidate);
  }

  function handleSubmit() {
    if (!file) {
      toast.error("Attach a receipt first");
      return;
    }

    startUpload(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to be signed in");
        return;
      }

      // Direct-to-Storage upload: the receipts bucket is private and its
      // RLS policies (sql/001) already check is_pool_member() and the
      // {pool_id}/{user_id}/... path, so this is safe straight from the
      // browser — no server round-trip for the file bytes.
      const path = buildReceiptStoragePath(poolId, user.id, file);
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        toast.error("Upload failed", { description: uploadError.message });
        return;
      }

      const { error } = await submitPaymentReceipt({
        poolId,
        cycleNumber: Number(cycleNumber),
        receiptPath: path,
      });

      if (error) {
        toast.error("Couldn't submit receipt", { description: error });
        return;
      }

      toast.success("Receipt submitted", { description: "The pool admin will review it shortly." });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Submit a receipt</p>
        <span className="font-mono text-sm text-muted-foreground">
          {formatCurrency(amount, currency)}
        </span>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-muted-foreground">Which cycle?</label>
        <Select value={cycleNumber} onValueChange={setCycleNumber}>
          <SelectTrigger className="font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxMembers }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                Cycle {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={[
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
          isDragging ? "border-primary bg-accent" : "border-border hover:border-primary/50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_RECEIPT_TYPES.join(",")}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="h-4 w-4" />
            {file.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-muted-foreground hover:text-ajo-danger"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag a receipt here, or click to choose a PNG, JPG, or PDF
            </p>
          </>
        )}
      </div>

      <Button onClick={handleSubmit} disabled={isUploading || !file} className="w-full">
        {isUploading ? "Submitting…" : "Submit receipt"}
      </Button>
    </div>
  );
}
