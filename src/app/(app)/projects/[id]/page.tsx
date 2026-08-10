import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  requireUser,
  fetchProject,
  fetchClients,
  fetchAccounts,
  fetchTeamMembers,
} from "@/lib/data";
import { ProjectDetail, type ProjectDetailData } from "@/components/projects/project-detail";

export const metadata: Metadata = {
  title: "Project",
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await fetchProject(user.id, id);
  if (!project) notFound();

  const [clients, accounts, teamMembers] = await Promise.all([
    fetchClients(user.id),
    fetchAccounts(user.id),
    fetchTeamMembers(user.id),
  ]);
  const client = project.client_id ? clients.find((c) => c.id === project.client_id) : null;
  const account = project.account_id ? accounts.find((a) => a.id === project.account_id) : null;

  const data: ProjectDetailData = {
    ...project,
    // Passwords never ship to the client — the UI only knows whether one
    // exists and fetches it on demand via a server action when revealed.
    credentials: project.credentials.map(({ password, ...rest }) => ({
      ...rest,
      has_password: Boolean(password),
    })),
    client_name: client?.name ?? null,
    account_name: account?.name ?? null,
  };

  return (
    <ProjectDetail project={data} currency={user.profile?.currency ?? "USD"} teamMembers={teamMembers} />
  );
}
