// Mirrors the `receipts` bucket's allowed_mime_types / file_size_limit
// from sql/001 — enforced server-side by Storage regardless, this just
// gives the person feedback before they wait on an upload that will fail.
export const ACCEPTED_RECEIPT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
];
export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateReceiptFile(file: File): string | null {
  if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
    return "Upload a PNG, JPG, or PDF file.";
  }
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return "File is too large — the limit is 10MB.";
  }
  return null;
}

// Matches the {pool_id}/{user_id}/{filename} convention the storage
// RLS policies (sql/001) rely on.
export function buildReceiptStoragePath(poolId: string, userId: string, file: File): string {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const ext = /^[a-z0-9]+$/.test(rawExt) ? rawExt : "bin";
  return `${poolId}/${userId}/${Date.now()}.${ext}`;
}
