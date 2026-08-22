import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser, fetchClients, fetchActivities } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { OutboundAnalytics } from "@/components/outbound/outbound-analytics";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Outbound Analytics",
};

export default async function OutboundAnalyticsPage() {
  const user = await requireUser();
  const [clients, activities] = await Promise.all([
    fetchClients(user.id),
    fetchActivities(user.id, 500),
  ]);

  const outboundLeads = clients.filter(
    (c) => c.outreach_status || c.lead_score || c.source || c.country,
  );

  // Get email activities for tracking stats
  const emailActivities = activities.filter(
    (a) => a.entity_type === "client" && a.activity_type === "email",
  );

  return (
    <div>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/outbound">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to leads
          </Link>
        </Button>
      </div>
      <PageHeader
        title="Outbound Analytics"
        description="Pipeline performance, conversion rates, and outreach metrics"
      />
      <OutboundAnalytics leads={outboundLeads} emailActivities={emailActivities} />
    </div>
  );
}
