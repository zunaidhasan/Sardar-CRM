import type { Metadata } from "next";
import {
  requireUser,
  fetchProjects,
  fetchOpportunities,
  fetchFollowUps,
  fetchInvoices,
  fetchMilestones,
  fetchTimeEntries,
} from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { buildCalendarEvents } from "@/lib/calendar";

export const metadata: Metadata = {
  title: "Calendar",
};

export default async function CalendarPage() {
  const user = await requireUser();
  const [projects, opportunities, followUps, invoices, milestones, timeEntries] =
    await Promise.all([
      fetchProjects(user.id),
      fetchOpportunities(user.id),
      fetchFollowUps(user.id),
      fetchInvoices(user.id),
      fetchMilestones(user.id),
      fetchTimeEntries(user.id),
    ]);

  const events = buildCalendarEvents({
    projects,
    opportunities,
    followUps,
    invoices,
    milestones,
    timeEntries,
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
