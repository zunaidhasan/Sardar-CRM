// ---------------------------------------------------------------------------
// Export Outbound Leads to CSV
//
// Generates a CSV file from filtered lead data that can be opened in
// Google Sheets, Excel, or any spreadsheet application.
// ---------------------------------------------------------------------------

import type { Client } from "@/lib/types";

interface ExportColumn {
  key: keyof Client | ((lead: Client) => string);
  header: string;
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "name", header: "Contact Name" },
  { key: "email", header: "Email" },
  { key: "company", header: "Company" },
  { key: "country", header: "Country" },
  { key: "industry", header: "Industry" },
  { key: "lead_score", header: "Lead Score" },
  { key: "outreach_status", header: "Outreach Status" },
  { key: "source", header: "Source" },
  { key: "website", header: "Website" },
  { key: "linkedin_url", header: "LinkedIn URL" },
  { key: "main_problem_found", header: "Main Problem" },
  { key: "website_review_notes", header: "Website Review Notes" },
  { key: "email_verified", header: "Email Verified" },
  { key: "follow_up_count", header: "Follow-up Count" },
  { key: "next_follow_up_date", header: "Next Follow-up" },
  { key: "last_email_sent_at", header: "Last Email Sent" },
  { key: (lead) => (lead.tags ?? []).join(", "), header: "Tags" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];

function escapeCSV(value: string): string {
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getCellValue(lead: Client, col: ExportColumn): string {
  if (typeof col.key === "function") {
    return col.key(lead);
  }
  const raw = lead[col.key];
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw);
}

/**
 * Generate a CSV string from a list of leads.
 */
export function generateCSV(leads: Client[]): string {
  const headers = EXPORT_COLUMNS.map((col) => escapeCSV(col.header));
  const rows = leads.map((lead) =>
    EXPORT_COLUMNS.map((col) => escapeCSV(getCellValue(lead, col)))
  );

  // BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  return BOM + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Trigger a browser download of the CSV file.
 */
export function downloadCSV(leads: Client[], filename?: string): void {
  const csv = generateCSV(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? `outbound-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
