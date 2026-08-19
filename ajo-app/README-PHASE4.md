# Phase 4 — Receipt Upload & Payment Tracker

## 1. Run the new SQL

`sql/004_payment_workflow.sql`:

- Adds `bank_name`, `account_name`, `account_number`, `payment_instructions`
  to `ajo_pools` (nullable — a pool can exist before an admin fills these in).
- Adds `payment_receipts` to the `supabase_realtime` publication, which the
  admin approvals ledger needs for live updates. Without this line, the
  Realtime subscription in `components/payments/approvals-table.tsx` will
  silently receive nothing.

Run it after `sql/001`–`sql/003`.

## 2. Add the new shadcn/ui components

```bash
npx shadcn@latest add dialog
npm install lucide-react
```

(`textarea`, `select`, `badge` were added in phase 3; `dialog` powers the
receipt preview modal. `lucide-react` supplies the upload/file icons —
likely already a transitive dependency from earlier shadcn components, but
listed explicitly here.)

## New in this phase

```
sql/004_payment_workflow.sql                        Bank detail columns + Realtime publication
lib/validations/payment.ts                           Zod: receipt submission, bank details form
lib/storage.ts                                        Accepted file types/size, storage path builder
app/dashboard/actions/payments.ts                     submitPaymentReceipt, updateBankDetails, reviewPaymentReceipt
app/dashboard/pools/[poolId]/pay/page.tsx              Member payment page
app/dashboard/pools/[poolId]/admin/approvals/page.tsx  Admin ledger page
components/payments/bank-details-card.tsx              Read-only display (member view)
components/payments/bank-details-editor.tsx             Admin edit form (on the pool detail page)
components/payments/receipt-upload-form.tsx             Cycle picker + drag-and-drop uploader
components/payments/receipt-history.tsx                 Member's own past receipts
components/payments/receipt-status-badge.tsx            pending→Under review, approved, rejected
components/payments/approvals-table.tsx                 Realtime ledger: tabs, table, approve/reject
components/payments/receipt-preview-dialog.tsx          Signed-URL preview modal (image or PDF link)
```

Also touched: `app/dashboard/pools/[poolId]/page.tsx` now links to
`/pay` and `/admin/approvals`, and hosts the bank-details editor for
admins. Its `isAdmin` check was also fixed to read `pool_members.role`
instead of only `ajo_pools.admin_id`, matching what `is_pool_admin()`
actually checks in RLS — a co-admin added later would otherwise have
been silently denied the admin-only sections. The same rule is used in
the new approvals page's redirect.

## How the pieces fit together

- **Upload path**: the file goes straight from the browser to the private
  `receipts` bucket using the phase-1 Storage RLS policies
  (`is_pool_member()` + the `{pool_id}/{user_id}/...` path convention) —
  it never passes through a server action. Only the small JSON row
  (`pool_id`, `cycle_number`, `receipt_url`, ...) goes through
  `submitPaymentReceipt`, which reads the contribution amount from the
  pool itself rather than trusting a client-supplied figure.
- **Preview**: `receipt_url` stores a Storage *object path*, not a public
  URL — the bucket is private. `ReceiptPreviewDialog` calls
  `createSignedUrl()` on open, which is itself gated by the same Storage
  RLS (uploader or pool admin only), so a member can't preview someone
  else's receipt by guessing a path.
- **Real-time**: `ApprovalsTable` subscribes to `postgres_changes` on
  `payment_receipts` filtered by `pool_id`. Delivery still respects RLS —
  a subscriber only receives events for rows their own session could
  already `SELECT`. New rows arrive as raw columns only (no joined member
  name), so the component does one extra `profiles` lookup the first time
  it sees an unfamiliar receipt id.
- **Race safety**: `reviewPaymentReceipt` filters `.eq("status", "pending")`
  on the update, so if two admins click Approve/Reject on the same row at
  once, the second gets "already reviewed" instead of silently flipping
  the first admin's decision.
