import type { Metadata } from "next";
import {
  requireUser,
  fetchProjects,
  fetchOpportunities,
  fetchInvoices,
  fetchFollowUps,
  fetchClients,
  fetchActivities,
  fetchTeamActivities,
  fetchOutboundLeads,
} from "@/lib/data";
import { buildActivityFeed } from "@/lib/activity-feed";
import { CeoDashboard } from "@/components/dashboard/ceo-dashboard";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  // The CEO sees workspace-wide activity (their own + team members', which
  // fetchTeamActivities already includes); executives only see their own.
  // Only the needed fetch runs per role. Fetched in parallel with the rest.
  const [projects, opportunities, invoices, followUps, clients, ownActivities, teamActivities, outboundLeads] =
    await Promise.all([
      fetchProjects(user.id),
      fetchOpportunities(user.id),
      fetchInvoices(user.id),
      fetchFollowUps(user.id),
      fetchClients(user.id),
      user.role === "ceo" ? Promise.resolve([]) : fetchActivities(user.id, 20),
      user.role === "ceo" ? fetchTeamActivities(user.id, 20) : Promise.resolve([]),
      fetchOutboundLeads(user.id),
    ]);

  const feed = buildActivityFeed(
    user.role === "ceo" ? teamActivities : ownActivities,
    { projects, opportunities, clients, invoices },
  );

  const currency = user.profile?.currency ?? "USD";
  const name = user.name ?? "there";
  // `|| null` (not `?? null`) so legacy empty-string avatars fall back to initials.
  const avatarUrl = user.profile?.avatar_url || null;

  // Role-based views: CEO sees the whole company, executives see their own work.
  if (user.role === "ceo") {
    return (
      <CeoDashboard
        userName={name}
        avatarUrl={avatarUrl}
        currency={currency}
        opportunities={opportunities}
        projects={projects}
        invoices={invoices}
        teamMembers={user.teamMembers}
        activities={feed}
      />
    );
  }

  return (
    <ExecutiveDashboard
      userName={name}
      avatarUrl={avatarUrl}
      currency={currency}
      opportunities={opportunities}
      projects={projects}
      followUps={followUps}
      activities={feed}
      outboundLeads={outboundLeads}
    />
  );
}
