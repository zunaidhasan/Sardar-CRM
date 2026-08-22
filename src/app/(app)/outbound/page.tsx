import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { requireUser, fetchClients, fetchTeamMembers, fetchActivities } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { OutboundViewToggle } from "@/components/outbound/outbound-view-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Outbound Leads",
};

export default async function OutboundPage() {
  const user = await requireUser();
  const [clients, teamMembers, allActivities] = await Promise.all([
    fetchClients(user.id),
    fetchTeamMembers(user.id),
    fetchActivities(user.id, 200),
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
      <PageHeader
        title="Outbound Leads"
        description={`${outboundLeads.length} leads in your cold email campaign`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/outbound/analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OutboundViewToggle
          leads={outboundLeads}
          userName={user.name}
          teamMembers={teamMembers}
          activitiesByClient={activitiesByClient}
        />
      </Suspense>
    </div>
  );
}
