// ---------------------------------------------------------------------------
// Generic CSV Export
//
// Exports any array of objects to CSV with configurable column definitions.
// Supports nested keys, formatters, and BOM for Excel UTF-8 compatibility.
// ---------------------------------------------------------------------------

export interface ExportColumn<T> {
  /** Key path or accessor function */
  key: keyof T | ((row: T) => string | number | boolean | null | undefined);
  /** CSV header label */
  header: string;
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getCellValue<T>(row: T, col: ExportColumn<T>): string {
  const raw: unknown =
    typeof col.key === "function"
      ? col.key(row)
      : row[col.key];
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw);
}

/**
 * Generate a CSV string from rows with column definitions.
 */
export function generateGenericCSV<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const headers = columns.map((c) => escapeCSV(c.header));
  const dataRows = rows.map((row) =>
    columns.map((c) => escapeCSV(getCellValue(row, c)))
  );
  const BOM = "\uFEFF";
  return BOM + [headers.join(","), ...dataRows.map((r) => r.join(","))].join("\n");
}

/**
 * Trigger a browser download of the CSV file.
 */
export function downloadGenericCSV<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void {
  const csv = generateGenericCSV(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Pre-built column definitions for each entity type
// ---------------------------------------------------------------------------

import type { Client, Opportunity, Project, Invoice } from "@/lib/types";

export const CLIENT_COLUMNS: ExportColumn<Client>[] = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "company", header: "Company" },
  { key: "platform", header: "Platform" },
  { key: "category", header: "Category" },
  { key: "country", header: "Country" },
  { key: "industry", header: "Industry" },
  { key: "lead_score", header: "Lead Score" },
  { key: "outreach_status", header: "Outreach Status" },
  { key: "source", header: "Source" },
  { key: "website", header: "Website" },
  { key: "linkedin_url", header: "LinkedIn" },
  { key: "next_follow_up_date", header: "Next Follow-up" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];

export const OPPORTUNITY_COLUMNS: ExportColumn<Opportunity>[] = [
  { key: "title", header: "Title" },
  { key: "platform", header: "Platform" },
  { key: "type", header: "Type" },
  { key: "stage", header: "Stage" },
  { key: "status", header: "Bid Status" },
  { key: "amount", header: "Amount" },
  { key: "currency", header: "Currency" },
  { key: "connects_spent", header: "Connects" },
  { key: "assigned_to", header: "Assigned To" },
  { key: "due_date", header: "Due Date" },
  { key: "next_follow_up", header: "Next Follow-up" },
  { key: "lost_reason", header: "Lost Reason" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];

export const PROJECT_COLUMNS: ExportColumn<Project>[] = [
  { key: "project_name", header: "Project Name" },
  { key: "status", header: "Status" },
  { key: "priority", header: "Priority" },
  { key: "progress", header: "Progress %" },
  { key: "gross_amount", header: "Gross Amount" },
  { key: "fee_percent", header: "Fee %" },
  { key: "net_amount", header: "Net Amount" },
  { key: "bonus", header: "Bonus" },
  { key: "assigned_to", header: "Assigned To" },
  { key: "developer", header: "Developer" },
  { key: "project_type", header: "Project Type" },
  { key: "order_date", header: "Order Date" },
  { key: "delivery_deadline", header: "Deadline" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];

export const INVOICE_COLUMNS: ExportColumn<Invoice>[] = [
  { key: "invoice_number", header: "Invoice #" },
  { key: "status", header: "Status" },
  { key: "amount", header: "Amount" },
  { key: "currency", header: "Currency" },
  { key: "issue_date", header: "Issue Date" },
  { key: "due_date", header: "Due Date" },
  { key: "paid_at", header: "Paid At" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];
