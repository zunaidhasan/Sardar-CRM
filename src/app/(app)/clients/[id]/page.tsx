import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser, fetchClientWithRelations, fetchAttachmentsForEntity, fetchTemplates } from "@/lib/data";
import { ClientProfile, type ClientProfileData } from "@/components/clients/client-profile";

export const metadata: Metadata = {
  title: "Client",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [client, templates] = await Promise.all([
    fetchClientWithRelations(user.id, id),
    fetchTemplates(user.id),
  ]);
  if (!client) notFound();

  const attachments = await fetchAttachmentsForEntity(user.id, "client", id);

  const data: ClientProfileData = { ...client, attachments };

  return (
    <ClientProfile
      client={data}
      currency={user.profile?.currency ?? "USD"}
      userName={user.name ?? user.profile?.full_name ?? "User"}
      avatarUrl={user.profile?.avatar_url || null}
      templates={templates}
    />
  );
}
