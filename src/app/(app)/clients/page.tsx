import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser, fetchClients } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ClientsList } from "@/components/clients/clients-list";
import { GenericExportButton } from "@/components/generic-export-button";
import { CLIENT_COLUMNS } from "@/lib/generic-export";
import { CardGridSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Clients",
};

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await fetchClients(user.id);

  return (
    <div>
      <PageHeader
        title="Clients & Contacts"
        description={`${clients.length} clients across your seller accounts`}
        actions={<GenericExportButton data={clients} columns={CLIENT_COLUMNS} filename="clients" />}
      />
      <Suspense fallback={<CardGridSkeleton count={6} />}>
        <ClientsList clients={clients} />
      </Suspense>
    </div>
  );
}
