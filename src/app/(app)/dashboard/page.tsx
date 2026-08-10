import type { Metadata } from "next";
import { requireUser, fetchProjects, fetchOpportunities, fetchInvoices, fetchFollowUps } from "@/lib/data";
import { CeoDashboard } from "@/components/dashboard/ceo-dashboard";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const [projects, opportunities, invoices, followUps] = await Promise.all([
    fetchProjects(user.id),
    fetchOpportunities(user.id),
    fetchInvoices(user.id),
    fetchFollowUps(user.id),
  ]);

  const currency = user.profile?.currency ?? "USD";
  const name = user.name ?? "there";

  // Role-based views: CEO sees the whole company, executives see their own work.
  if (user.role === "ceo") {
    return (
      <CeoDashboard
        userName={name}
        currency={currency}
        opportunities={opportunities}
        projects={projects}
        invoices={invoices}
        teamMembers={user.teamMembers}
      />
    );
  }

  return (
    <ExecutiveDashboard
      userName={name}
      currency={currency}
      opportunities={opportunities}
      projects={projects}
      followUps={followUps}
    />
  );
}
