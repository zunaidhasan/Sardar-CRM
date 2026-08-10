"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, Plus } from "lucide-react";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import { InvoiceDetailDialog, effectiveStatus } from "@/components/invoices/invoice-detail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceStatusBadge } from "@/components/status-badges";
import { INVOICE_STATUSES, INVOICE_STATUS_META } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { updateInvoiceAction, deleteInvoiceAction } from "@/app/actions";
import type { Account, Client, Invoice, InvoiceItem, Project } from "@/lib/types";

interface InvoicesListProps {
  invoices: Invoice[];
  clients: Client[];
  projects: Project[];
  accounts: Account[];
  itemsByInvoice: Map<string, InvoiceItem[]>;
  currency: string;
}

export function InvoicesList({
  invoices,
  clients,
  projects,
  accounts,
  itemsByInvoice,
  currency,
}: InvoicesListProps) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<string>("unpaid");
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<Invoice | null>(null);
  const clientById = new Map(clients.map((c) => [c.id, c.name]));
  const projectById = new Map(projects.map((p) => [p.id, p.project_name]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  // Keep the open detail dialog in sync after status changes refresh the list.
  React.useEffect(() => {
    if (!detail) return;
    const fresh = invoices.find((i) => i.id === detail.id);
    if (fresh) setDetail(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const withEffective = invoices.map((inv) => ({ ...inv, eff: effectiveStatus(inv) }));
  const filtered =
    filter === "all"
      ? withEffective
      : filter === "unpaid"
        ? withEffective.filter((i) => i.eff === "pending" || i.eff === "overdue")
        : withEffective.filter((i) => i.eff === filter);

  const totalPending = withEffective
    .filter((i) => i.eff === "pending" || i.eff === "overdue")
    .reduce((s, i) => s + i.amount, 0);
  const totalPaid = withEffective.filter((i) => i.eff === "paid").reduce((s, i) => s + i.amount, 0);
  const overdueCount = withEffective.filter((i) => i.eff === "overdue").length;

  async function markPaid(inv: Invoice) {
    const result = await updateInvoiceAction(inv.id, {
      status: "paid",
      paid_at: new Date().toISOString().slice(0, 10),
    });
    if (result.ok) {
      toast.success(`${inv.invoice_number} marked as paid`);
      router.refresh();
    } else toast.error(result.error);
  }

  async function markPending(inv: Invoice) {
    const result = await updateInvoiceAction(inv.id, { status: "pending", paid_at: null });
    if (result.ok) {
      toast.success(`${inv.invoice_number} moved to pending`);
      router.refresh();
    } else toast.error(result.error);
  }

  async function handleDelete(inv: Invoice) {
    if (!window.confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    const result = await deleteInvoiceAction(inv.id);
    if (result.ok) {
      toast.success("Invoice deleted");
      router.refresh();
    } else toast.error(result.error);
  }

  // Always exports every invoice (not just the filtered view) so a manager
  // can hand the full ledger to accounting regardless of the active filter.
  function exportCSV() {
    const header = [
      "Invoice",
      "Status",
      "Client",
      "Project",
      "Issue date",
      "Due date",
      "Paid on",
      "Amount",
      "Currency",
      "Notes",
    ];
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      header.join(","),
      ...withEffective.map((inv) =>
        [
          inv.invoice_number,
          INVOICE_STATUS_META[inv.eff].label,
          inv.client_id ? (clientById.get(inv.client_id) ?? "") : "",
          inv.project_id ? (projectById.get(inv.project_id) ?? "") : "",
          inv.issue_date ?? "",
          inv.due_date ?? "",
          inv.paid_at ?? "",
          inv.amount,
          inv.currency,
          inv.notes ?? "",
        ]
          .map(escape)
          .join(","),
      ),
    ];
    // BOM so Excel renders non-ASCII characters (currency symbols, em-dashes) correctly.
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sardarcrm-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Small delay before revoking keeps the download reliable in Safari.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`Exported ${withEffective.length} invoices to CSV`);
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{formatCurrency(totalPending, currency)}</CardTitle>
            <CardDescription>Pending + overdue</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{formatCurrency(totalPaid, currency)}</CardTitle>
            <CardDescription>Collected</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-lg", overdueCount > 0 && "text-destructive")}>
              {overdueCount}
            </CardTitle>
            <CardDescription>Overdue invoices</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All invoices</SelectItem>
            <SelectItem value="unpaid">Unpaid (pending + overdue)</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {INVOICE_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download /> Export CSV
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus /> New invoice
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden lg:table-cell">Project</TableHead>
              <TableHead className="hidden sm:table-cell">Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No invoices here.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((inv) => (
              <TableRow
                key={inv.id}
                onClick={() => setDetail(inv)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetail(inv);
                  }
                }}
                tabIndex={0}
                aria-label={`View invoice ${inv.invoice_number}`}
                className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus:outline-none"
              >
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {inv.invoice_number}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {inv.client_id ? clientById.get(inv.client_id) ?? "—" : "—"}
                </TableCell>
                <TableCell className="hidden max-w-[220px] truncate lg:table-cell">
                  {inv.project_id ? projectById.get(inv.project_id) ?? "—" : "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={cn("text-xs", inv.eff === "overdue" && "font-medium text-rose-500")}>
                    {formatDate(inv.due_date)}
                  </span>
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.eff} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(inv.amount, inv.currency)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {inv.eff !== "paid" ? (
                      <Button size="sm" variant="outline" onClick={() => markPaid(inv)}>
                        Mark paid
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => markPending(inv)}>
                        Reopen
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(inv)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InvoiceDialog
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        projects={projects}
        currency={currency}
      />

      {detail && (
        <InvoiceDetailDialog
          invoice={detail}
          client={
            detail.client_id
              ? (clients.find((c) => c.id === detail.client_id) ?? null)
              : null
          }
          project={
            detail.project_id
              ? (projects.find((p) => p.id === detail.project_id) ?? null)
              : null
          }
          account={
            detail.project_id
              ? (accountById.get(
                  projects.find((p) => p.id === detail.project_id)?.account_id ?? "",
                ) ?? null)
              : null
          }
          items={itemsByInvoice.get(detail.id) ?? []}
          currency={currency}
          open={Boolean(detail)}
          onOpenChange={(o) => {
            if (!o) setDetail(null);
          }}
        />
      )}
    </>
  );
}
