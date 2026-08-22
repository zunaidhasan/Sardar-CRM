import type {
  Client,
  FollowUp,
  Invoice,
  Milestone,
  Opportunity,
  Project,
  TimeEntry,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Calendar event model — built on the server, rendered client-side.
// Kinds map to colors + ICS categories on the Calendar page.
// ---------------------------------------------------------------------------

export type CalendarEventKind = "deadline" | "follow_up" | "milestone" | "invoice" | "time";

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  kind: CalendarEventKind;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  hours?: number; // time entries only
}

export const EVENT_KIND_META: Record<
  CalendarEventKind,
  { label: string; chip: string; dot: string }
> = {
  deadline: { label: "Deadlines", chip: "bg-emerald-500/90 text-white", dot: "bg-emerald-500" },
  follow_up: { label: "Follow-ups", chip: "bg-sky-500/90 text-white", dot: "bg-sky-500" },
  milestone: { label: "Milestones", chip: "bg-violet-500/90 text-white", dot: "bg-violet-500" },
  invoice: { label: "Invoices", chip: "bg-amber-500/90 text-white", dot: "bg-amber-500" },
  time: { label: "Time logged", chip: "bg-slate-500/90 text-white", dot: "bg-slate-500" },
};

export function buildCalendarEvents(input: {
  projects: Project[];
  opportunities: Opportunity[];
  followUps: FollowUp[];
  invoices: Invoice[];
  milestones: Milestone[];
  timeEntries: TimeEntry[];
  outboundLeads?: Client[];
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const projectName = new Map(input.projects.map((p) => [p.id, p.project_name]));
  const oppTitle = new Map(input.opportunities.map((o) => [o.id, o.title]));

  // Project delivery deadlines
  for (const p of input.projects) {
    if (!p.delivery_deadline) continue;
    events.push({
      id: `dl-${p.id}`,
      date: p.delivery_deadline,
      kind: "deadline",
      title: p.project_name,
      subtitle: p.developer ?? p.assigned_to,
      href: `/projects/${p.id}`,
    });
  }

  // Follow-ups (lead nurture)
  for (const f of input.followUps) {
    if (!f.scheduled_at || f.status === "complete" || f.status === "archived") continue;
    const oppId = f.opportunity_id;
    const title = (oppId ? oppTitle.get(oppId) : null) ?? f.notes ?? "Follow-up";
    events.push({
      id: `fu-${f.id}`,
      date: f.scheduled_at,
      kind: "follow_up",
      title,
      subtitle: f.notes,
      href: oppId ? `/pipeline?deal=${oppId}` : null,
    });
  }

  // Opportunity next follow-up dates
  for (const o of input.opportunities) {
    if (!o.next_follow_up || o.stage === "won" || o.stage === "lost") continue;
    events.push({
      id: `of-${o.id}`,
      date: o.next_follow_up,
      kind: "follow_up",
      title: o.title,
      subtitle: "Next follow-up",
      href: `/pipeline?deal=${o.id}`,
    });
  }

  // Invoice due dates
  for (const inv of input.invoices) {
    if (!inv.due_date || inv.status === "paid") continue;
    events.push({
      id: `inv-${inv.id}`,
      date: inv.due_date,
      kind: "invoice",
      title: inv.invoice_number,
      subtitle: "Invoice due",
      href: "/invoices",
    });
  }

  // Milestone due dates
  for (const m of input.milestones) {
    if (!m.due_date || m.status === "done") continue;
    events.push({
      id: `ms-${m.id}`,
      date: m.due_date,
      kind: "milestone",
      title: m.title,
      subtitle: projectName.get(m.project_id) ?? null,
      href: `/projects/${m.project_id}`,
    });
  }

  // Time entries (tracked hours)
  for (const e of input.timeEntries) {
    events.push({
      id: `te-${e.id}`,
      date: e.date,
      kind: "time",
      title: e.description ?? "Time entry",
      subtitle: `${e.assignee ?? "—"} · ${e.billable ? "Billable" : "Non-billable"}`,
      href: `/projects/${e.project_id}`,
      hours: e.hours,
    });
  }

  // Outbound lead follow-up dates
  for (const lead of input.outboundLeads ?? []) {
    if (!lead.next_follow_up_date || lead.outreach_status === "Won" || lead.outreach_status === "Lost") continue;
    events.push({
      id: `ol-${lead.id}`,
      date: lead.next_follow_up_date,
      kind: "follow_up",
      title: `${lead.name} — ${lead.company ?? "Lead"}`,
      subtitle: `Follow-up #${(lead.follow_up_count ?? 0) + 1}`,
      href: `/clients/${lead.id}`,
    });
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** True when the given date (YYYY-MM-DD) falls inside the month view. */
export function inMonth(date: string, year: number, month: number): boolean {
  return date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
}
