import type { Metadata } from "next";
import {
  requireUser,
  fetchProjects,
  fetchOpportunities,
  fetchFollowUps,
  fetchInvoices,
  fetchMilestones,
  fetchTimeEntries,
  fetchClients,
} from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { buildCalendarEvents } from "@/lib/calendar";

export const metadata: Metadata = {
  title: "Calendar",
};

export default async function CalendarPage() {
  const user = await requireUser();
  const [projects, opportunities, followUps, invoices, milestones, timeEntries, clients] =
    await Promise.all([
      fetchProjects(user.id),
      fetchOpportunities(user.id),
      fetchFollowUps(user.id),
      fetchInvoices(user.id),
      fetchMilestones(user.id),
      fetchTimeEntries(user.id),
      fetchClients(user.id),
    ]);

  // Outbound leads with follow-up dates
  const outboundLeads = clients.filter((c) => c.outreach_status && c.next_follow_up_date);

  const events = buildCalendarEvents({
    projects,
    opportunities,
    followUps,
    invoices,
    milestones,
    timeEntries,
    outboundLeads,
  });

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Your deadlines, follow-ups, milestones and tracked hours at a glance. Export any month to Google Calendar or Outlook."
      />
      <CalendarView events={events} />
    </div>
  );
}
