// ---------------------------------------------------------------------------
// RFC 5545 iCalendar (.ics) builder.
//
// Generates an all-day-events calendar file that imports cleanly into Google
// Calendar and Outlook (both support .ics import). Date values use the
// VALUE=DATE form so events are day-based, not timezone-dependent.
// ---------------------------------------------------------------------------

import type { CalendarEvent } from "@/lib/calendar";

/** Escape a text value per RFC 5545 (commas, semicolons, newlines, backslash). */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsDate(date: string): string {
  return date.replace(/-/g, ""); // YYYY-MM-DD -> YYYYMMDD
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Build a complete .ics document for the given events. */
export function buildICS(events: CalendarEvent[], title: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sardar CRM//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(title)}`,
  ];

  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${esc(`sardar-crm-${e.id}`)}@sardarcrm`);
    lines.push(`DTSTAMP:${nowStamp()}Z`);
    lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    const description = e.subtitle ? `${e.title} — ${e.subtitle}` : e.title;
    lines.push(`DESCRIPTION:${esc(description)}`);
    if (e.hours != null) {
      lines.push(`X-SARDAR-HOURS:${e.hours}`);
    }
    if (e.href) {
      lines.push(`URL:${esc(`https://${typeof window !== "undefined" ? window.location.host : "app.sardarcrm"}${e.href}`)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC 5545 requires CRLF line endings and a trailing blank line.
  return lines.join("\r\n") + "\r\n";
}

/** Trigger a browser download of the .ics file. Client-side only. */
export function downloadICS(events: CalendarEvent[], fileName: string, title: string): void {
  const blob = new Blob([buildICS(events, title)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
