import type { Metadata } from "next";
import {
  requireUser,
  fetchInvoices,
  fetchClients,
  fetchProjects,
  fetchAccounts,
  fetchInvoiceItems,
} from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { InvoicesList } from "@/components/invoices/invoices-list";
import type { InvoiceItem } from "@/lib/types";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage() {
  const user = await requireUser();
  const [invoices, clients, projects, accounts] = await Promise.all([
    fetchInvoices(user.id),
    fetchClients(user.id),
    fetchProjects(user.id),
    fetchAccounts(user.id),
  ]);

  // Load line items for every invoice so the detail view renders instantly.
  const itemsByInvoice = new Map<string, InvoiceItem[]>();
  await Promise.all(
    invoices.map(async (inv) => {
      itemsByInvoice.set(inv.id, await fetchInvoiceItems(user.id, inv.id));
    }),
  );

  return (
    <div>
      <PageHeader
        title="Invoicing Hub"
        description="Create invoices from projects, track paid, pending and overdue. Click any invoice to open its full order invoice."
      />
      <InvoicesList
        invoices={invoices}
        clients={clients}
        projects={projects}
        accounts={accounts}
        itemsByInvoice={itemsByInvoice}
        currency={user.profile?.currency ?? "USD"}
      />
    </div>
  );
}
