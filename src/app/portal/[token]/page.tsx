import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchPortalByToken,
  fetchPortalSignatures,
  fetchClient,
  fetchProject,
} from "@/lib/data";
import { PortalView } from "@/components/portal/portal-view";

export const metadata: Metadata = {
  title: "Client portal",
};

export const dynamic = "force-dynamic";

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const portal = await fetchPortalByToken(token);
  if (!portal) notFound();

  const [client, project, signatures] = await Promise.all([
    fetchClient(portal.user_id, portal.client_id),
    portal.project_id ? fetchProject(portal.user_id, portal.project_id) : Promise.resolve(null),
    fetchPortalSignatures(portal.id),
  ]);
  if (!client) notFound();

  return (
    <PortalView
      token={token}
      client={client}
      project={project}
      milestones={project?.milestones ?? []}
      signatures={signatures}
      currency="USD"
    />
  );
}
