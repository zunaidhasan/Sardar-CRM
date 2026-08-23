import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart3, Download } from "lucide-react";
import { requireUser, fetchClients, fetchTeamMembers, fetchActivities, fetchTemplates } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { OutboundViewToggle } from "@/components/outbound/outbound-view-toggle";
import { ExportLeadsButton } from "@/components/outbound/export-leads-button";
import { FollowUpReminderBanner } from "@/components/outbound/follow-up-reminder-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Outbound Leads",
};

export default async function OutboundPage() {
  const user = await requireUser();
  const [clients, teamMembers, allActivities, templates] = await Promise.all([
    fetchClients(user.id),
    fetchTeamMembers(user.id),
    fetchActivities(user.id, 200),
    fetchTemplates(user.id),
  ]);
  // Filter to only clients that have outreach data (outbound leads)
  const outboundLeads = clients.filter(
    (c) => c.outreach_status || c.lead_score || c.source || c.country,
  );

  // Group activities by client ID for quick lookup
  const activitiesByClient = new Map<string, typeof allActivities>();
  for (const a of allActivities) {
    if (a.entity_type === "client") {
      const list = activitiesByClient.get(a.entity_id) ?? [];
      list.push(a);
      activitiesByClient.set(a.entity_id, list);
    }
  }

  return (
    <div>
      <FollowUpReminderBanner leads={outboundLeads} />
      <PageHeader
        title="Outbound Leads"
        description={`${outboundLeads.length} leads in your cold email campaign`}
        actions={
          <div className="flex gap-2">
            <ExportLeadsButton leads={outboundLeads} />
            <Button asChild variant="outline" size="sm">
              <Link href="/outbound/analytics">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
            </Button>
          </div>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OutboundViewToggle
          leads={outboundLeads}
          userName={user.name}
          templates={templates}
          teamMembers={teamMembers}
          activitiesByClient={activitiesByClient}
        />
      </Suspense>
    </div>
  );
}
