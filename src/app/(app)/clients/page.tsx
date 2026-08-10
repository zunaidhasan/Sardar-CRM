import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser, fetchClients } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ClientsList } from "@/components/clients/clients-list";
import { Skeleton } from "@/components/ui/skeleton";

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
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ClientsList clients={clients} />
      </Suspense>
    </div>
  );
}
