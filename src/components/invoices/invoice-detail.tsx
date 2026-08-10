"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarDays,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AppLogo } from "@/components/layout/app-logo";
import { InvoiceStatusBadge, PlatformBadge } from "@/components/status-badges";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { updateInvoiceAction, deleteInvoiceAction } from "@/app/actions";
import type {
  Account,
  Client,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Platform,
  Project,
} from "@/lib/types";

export function effectiveStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === "pending" && inv.due_date) {
    const days = daysUntil(inv.due_date);
    if (days !== null && days < 0) return "overdue";
  }
  return inv.status;
}

interface InvoiceDetailDialogProps {
  invoice: Invoice;
  client?: Client | null;
  project?: Project | null;
  account?: Account | null;
  items: InvoiceItem[];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * Detailed invoice view styled like a Fiverr custom-offer order invoice:
 * buyer/seller cards, an itemized order summary, platform fee breakdown and
 * the net amount the seller receives.
 */
export function InvoiceDetailDialog({
  invoice,
  client,
  project,
  account,
  items,
  currency,
  open,
  onOpenChange,
}: InvoiceDetailDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"paid" | "pending" | "delete" | null>(null);

  const status = effectiveStatus(invoice);
  const lineItems: InvoiceItem[] =
    items.length > 0
      ? items
      : [
          {
            id: "line-total",
            invoice_id: invoice.id,
            description: project
              ? `Project payment — ${project.project_name}`
              : "Invoice total",
            quantity: 1,
            unit_price: invoice.amount,
            amount: invoice.amount,
          },
        ];

  const subtotal = lineItems.reduce((sum, it) => sum + it.amount, 0);
  const serviceFee =
    project && project.fee_amount > 0 ? project.fee_amount : 0;
  const buyerTotal = subtotal + serviceFee;
  const sellerPlatform: Platform | null =
    account?.platform ?? client?.platform ?? null;

  async function run(
    action: "paid" | "pending" | "delete",
    patch: Parameters<typeof updateInvoiceAction>[1] | null,
  ) {
    setBusy(action);
    const result =
      action === "delete"
        ? await deleteInvoiceAction(invoice.id)
        : await updateInvoiceAction(invoice.id, patch ?? {});
    setBusy(null);
    if (result.ok) {
      toast.success(
        action === "delete"
          ? "Invoice deleted"
          : action === "paid"
            ? `${invoice.invoice_number} marked as paid`
            : `${invoice.invoice_number} moved to pending`,
      );
      if (action === "delete") onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b pb-4">
          <AppLogo size="sm" rounded={false} className="h-7" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              {invoice.invoice_number}
            </DialogTitle>
            <DialogDescription>Order invoice</DialogDescription>
          </div>
          <InvoiceStatusBadge status={status} />
        </DialogHeader>

        <div className="space-y-5">
          {/* Buyer / seller cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
                Buyer
              </div>
              <p className="mt-2 text-base font-semibold">
                {client?.name ?? "—"}
              </p>
              {client?.company && (
                <p className="text-sm text-muted-foreground">{client.company}</p>
              )}
              {client?.username && (
                <p className="mt-1 text-xs text-muted-foreground">
                  @{client.username}
                </p>
              )}
              {client?.email && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {client.email}
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sold by
              </div>
              <p className="mt-2 text-base font-semibold">
                {account?.name ?? "Sardar IT"}
              </p>
              {account?.username && (
                <p className="text-sm text-muted-foreground">
                  @{account.username}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                {sellerPlatform ? (
                  <PlatformBadge platform={sellerPlatform} />
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Direct
                  </span>
                )}
                {project && (
                  <span className="truncate text-xs text-muted-foreground">
                    {project.project_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Order dates */}
          <div className="rounded-lg border bg-card">
            <dl className="divide-y divide-border px-4">
              <InfoRow label="Order date" value={formatDate(invoice.issue_date)} />
              <InfoRow
                label="Due date"
                value={
                  <span
                    className={cn(
                      status === "overdue" && "text-rose-500",
                    )}
                  >
                    {formatDate(invoice.due_date)}
                  </span>
                }
              />
              <InfoRow
                label="Paid on"
                value={
                  invoice.paid_at ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600">
                      <BadgeCheck className="h-4 w-4" />
                      {formatDate(invoice.paid_at)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
          </div>

          {/* Itemized order summary */}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Order summary
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-3 py-2.5 text-center font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Unit price
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lineItems.map((it, i) => (
                    <tr key={it.id ?? i}>
                      <td className="px-4 py-3 font-medium">
                        {it.description}
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {it.quantity}
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        {formatCurrency(it.unit_price, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(it.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1.5 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex w-full max-w-xs items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal, invoice.currency)}</span>
            </div>
            {serviceFee > 0 && (
              <div className="flex w-full max-w-xs items-center justify-between">
                <span className="text-muted-foreground">
                  Service fee ({project?.fee_percent ?? 0}%)
                </span>
                <span className="font-medium">
                  +{formatCurrency(serviceFee, invoice.currency)}
                </span>
              </div>
            )}
            <Separator className="max-w-xs" />
            <div className="flex w-full max-w-xs items-center justify-between">
              <span className="text-muted-foreground">
                {serviceFee > 0 ? "Buyer total" : "Total"}
              </span>
              <span className="font-semibold">
                {formatCurrency(buyerTotal, invoice.currency)}
              </span>
            </div>
            <div className="flex w-full max-w-xs items-center justify-between rounded-md bg-primary/10 px-2 py-1.5">
              <span className="font-medium text-primary">You&apos;ll receive</span>
              <span className="text-base font-bold text-primary">
                {formatCurrency(invoice.amount, invoice.currency)}
              </span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes ? (
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{invoice.notes}</p>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col-reverse items-stretch gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={busy !== null}
            onClick={() => run("delete", null)}
          >
            {busy === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {status !== "paid" ? (
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() =>
                  run("paid", {
                    status: "paid",
                    paid_at: new Date().toISOString().slice(0, 10),
                  })
                }
              >
                {busy === "paid" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <BadgeCheck className="h-4 w-4" />
                Mark as paid
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => run("pending", { status: "pending", paid_at: null })}
              >
                <CalendarDays className="h-4 w-4" />
                Reopen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
