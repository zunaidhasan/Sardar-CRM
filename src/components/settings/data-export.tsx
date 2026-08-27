"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Users,
  Briefcase,
  FolderKanban,
  Receipt,
  Loader2,
  CheckCircle2,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-provider";
import {
  generateGenericCSV,
  type ExportColumn,
} from "@/lib/generic-export";
import type { Client, Opportunity, Project, Invoice, TeamMember } from "@/lib/types";

interface DataExportProps {
  clients: Client[];
  opportunities: Opportunity[];
  projects: Project[];
  invoices: Invoice[];
  teamMembers: TeamMember[];
  currency: string;
}

const ENTITY_CONFIG: Array<{
  key: string;
  label: string;
  icon: typeof Download;
  description: string;
}> = [
  { key: "clients", label: "Clients", icon: Users, description: "All client profiles and contact info" },
  { key: "deals", label: "Deals", icon: Briefcase, description: "Pipeline opportunities and bids" },
  { key: "projects", label: "Projects", icon: FolderKanban, description: "Orders, milestones, and financials" },
  { key: "invoices", label: "Invoices", icon: Receipt, description: "Invoice records and payment status" },
];

const CLIENT_COLS: ExportColumn<Client>[] = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "company", header: "Company" },
  { key: "platform", header: "Platform" },
  { key: "category", header: "Category" },
  { key: "country", header: "Country" },
  { key: "industry", header: "Industry" },
  { key: "website", header: "Website" },
  { key: "lead_score", header: "Lead Score" },
  { key: "outreach_status", header: "Outreach Status" },
  { key: "source", header: "Source" },
  { key: "next_follow_up_date", header: "Next Follow-up" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];

const DEAL_COLS: ExportColumn<Opportunity>[] = [
  { key: "title", header: "Title" },
  { key: "platform", header: "Platform" },
  { key: "type", header: "Type" },
  { key: "stage", header: "Stage" },
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

const PROJECT_COLS: ExportColumn<Project>[] = [
  { key: "project_name", header: "Project Name" },
  { key: "status", header: "Status" },
  { key: "priority", header: "Priority" },
  { key: "progress", header: "Progress %" },
  { key: "gross_amount", header: "Gross Amount" },
  { key: "fee_percent", header: "Fee %" },
  { key: "fee_amount", header: "Fee Amount" },
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

const INVOICE_COLS: ExportColumn<Invoice>[] = [
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

function downloadCSV<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
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

export function DataExport({
  clients,
  opportunities,
  projects,
  invoices,
  teamMembers,
  currency,
}: DataExportProps) {
  const { t } = useI18n();
  const [exportingAll, setExportingAll] = React.useState(false);
  const [exportedEntity, setExportedEntity] = React.useState<string | null>(null);

  const counts = {
    clients: clients.length,
    deals: opportunities.length,
    projects: projects.length,
    invoices: invoices.length,
  };

  function handleExportEntity(key: string) {
    switch (key) {
      case "clients":
        downloadCSV(clients, CLIENT_COLS, "sardar-crm-clients.csv");
        break;
      case "deals":
        downloadCSV(opportunities, DEAL_COLS, "sardar-crm-deals.csv");
        break;
      case "projects":
        downloadCSV(projects, PROJECT_COLS, "sardar-crm-projects.csv");
        break;
      case "invoices":
        downloadCSV(invoices, INVOICE_COLS, "sardar-crm-invoices.csv");
        break;
    }
    setExportedEntity(key);
    setTimeout(() => setExportedEntity(null), 2000);
    toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} exported successfully`);
  }

  function handleExportAll() {
    setExportingAll(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);

      // Export each entity type with a small delay for UX
      setTimeout(() => {
        downloadCSV(clients, CLIENT_COLS, `sardar-crm-clients-${timestamp}.csv`);
        setTimeout(() => {
          downloadCSV(opportunities, DEAL_COLS, `sardar-crm-deals-${timestamp}.csv`);
          setTimeout(() => {
            downloadCSV(projects, PROJECT_COLS, `sardar-crm-projects-${timestamp}.csv`);
            setTimeout(() => {
              downloadCSV(invoices, INVOICE_COLS, `sardar-crm-invoices-${timestamp}.csv`);
              setExportingAll(false);
              toast.success("All data exported! Check your downloads folder.");
            }, 300);
          }, 300);
        }, 300);
      }, 300);
    } catch {
      setExportingAll(false);
      toast.error("Export failed");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Data Export & Backup</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Export your CRM data to CSV. Your data is never locked in.
          </p>
        </div>
        <Button
          onClick={handleExportAll}
          disabled={exportingAll}
          size="sm"
        >
          {exportingAll ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Archive className="mr-1 h-3.5 w-3.5" />
          )}
          Export All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ENTITY_CONFIG.map((entity) => {
            const Icon = entity.icon;
            const count = counts[entity.key as keyof typeof counts] ?? 0;
            const wasExported = exportedEntity === entity.key;
            return (
              <div
                key={entity.key}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{entity.label}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {count} rows
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entity.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportEntity(entity.key)}
                  disabled={count === 0}
                >
                  {wasExported ? (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Download className="mr-1 h-3.5 w-3.5" />
                  )}
                  CSV
                </Button>
              </div>
            );
          })}
        </div>
        <Separator className="my-4" />
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Exports include all visible data for your account.
            In demo mode, this includes sample data. With Supabase connected, exports
            include only your own data (enforced by row-level security).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
