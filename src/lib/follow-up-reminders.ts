// ---------------------------------------------------------------------------
// Follow-up Reminders
//
// Client-side utility that checks for overdue follow-ups and shows browser
// notifications. Works with the Notification API and the PWA service worker.
// ---------------------------------------------------------------------------

import type { Client, OutreachStatus } from "@/lib/types";

interface OverdueLead {
  id: string;
  name: string;
  company: string | null;
  nextFollowUp: string;
  daysOverdue: number;
  outreachStatus: OutreachStatus;
}

/**
 * Find leads with overdue or today's follow-up dates.
 */
export function findOverdueLeads(leads: Client[]): OverdueLead[] {
  const now = new Date();
  todayStart(now);
  // Compare as YYYY-MM-DD strings to avoid timezone mismatches between
  // local midnight (todayStart) and UTC midnight (new Date("YYYY-MM-DD")).
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  return leads
    .filter((lead) => {
      if (!lead.next_follow_up_date) return false;
      if (lead.outreach_status === "Won" || lead.outreach_status === "Lost") return false;
      return lead.next_follow_up_date <= todayStr;
    })
    .map((lead) => {
      // Compute daysOverdue using string comparison to avoid timezone
      // mismatches between local midnight and UTC midnight.
      const leadDate = lead.next_follow_up_date!;
      const leadParts = leadDate.split("-").map(Number);
      const todayParts = todayStr.split("-").map(Number);
      const leadTime = new Date(leadParts[0], leadParts[1] - 1, leadParts[2]).getTime();
      const todayTime = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]).getTime();
      const daysOverdue = Math.round((todayTime - leadTime) / (1000 * 60 * 60 * 24));
      return {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        nextFollowUp: lead.next_follow_up_date!,
        daysOverdue,
        outreachStatus: lead.outreach_status,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function todayStart(date: Date): void {
  date.setHours(0, 0, 0, 0);
}

/**
 * Request browser notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Show a browser notification for overdue follow-ups.
 */
export function showFollowUpNotification(overdueLeads: OverdueLead[]): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (overdueLeads.length === 0) return;

  const count = overdueLeads.length;
  const urgent = overdueLeads.filter((l) => l.daysOverdue > 0);
  const dueToday = count - urgent.length;

  let body = "";
  if (urgent.length > 0) {
    body += `${urgent.length} lead${urgent.length > 1 ? "s" : ""} overdue`;
    if (urgent.length <= 3) {
      body += `: ${urgent.map((l) => l.name).join(", ")}`;
    }
    body += ". ";
  }
  if (dueToday > 0) {
    body += `${dueToday} follow-up${dueToday > 1 ? "s" : ""} due today.`;
  }

  new Notification("Follow-up Reminders", {
    body,
    icon: "/sardar-fav.png",
    tag: "follow-up-reminders",
    requireInteraction: false,
  });
}

/**
 * Check for overdue leads and show notification if any.
 * Should be called periodically (e.g., every 30 minutes).
 */
export function checkAndNotify(leads: Client[]): void {
  const overdue = findOverdueLeads(leads);
  if (overdue.length > 0) {
    showFollowUpNotification(overdue);
  }
}
