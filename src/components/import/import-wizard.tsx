"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileSpreadsheet, FileUp, Loader2, Table2 } from "lucide-react";
import { importRowsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ImportEntity } from "@/lib/types";

type ParsedSheet = {
  fileName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
};

const FIELD_DEFS: Record<ImportEntity, { label: string; required: string[]; fields: string[] }> = {
  projects: {
    label: "Projects / Orders",
    required: ["project_name"],
    fields: [
      "project_name", "order_date", "client_name", "assigned_to", "developer",
      "website_link", "project_type", "delivery_deadline", "gross_amount",
      "fee_percent", "bonus", "status", "priority", "progress", "notes",
    ],
  },
  opportunities: {
    label: "Bids / Pre-sales",
    required: ["title"],
    fields: [
      "title", "description", "client_name", "platform", "type", "stage", "status",
      "amount", "connects_spent", "source_url", "next_follow_up", "assigned_to", "notes",
    ],
  },
  clients: {
    label: "Clients",
    required: ["name"],
    fields: ["name", "email", "company", "platform", "username", "category", "notes"],
  },
};

const FIELD_LABELS: Record<string, string> = {
  project_name: "Project name",
  order_date: "Order date",
  client_name: "Client name",
  assigned_to: "Assigned to",
  developer: "Developer",
  website_link: "Website link",
  project_type: "Project type",
  delivery_deadline: "Deadline",
  gross_amount: "Gross amount",
  fee_percent: "Fee %",
  bonus: "Bonus",
  status: "Status",
  priority: "Priority",
  progress: "Progress",
  notes: "Notes",
  title: "Deal title",
  description: "Description",
  platform: "Platform",
  type: "Type (bid / pre_sales)",
  stage: "Stage",
  amount: "Amount",
  connects_spent: "Connects",
  source_url: "Source URL",
  next_follow_up: "Next follow-up",
  name: "Name",
  email: "Email",
  company: "Company",
  username: "Username",
  category: "Category",
};

const SYNONYMS: Record<string, string[]> = {
  project_name: ["project", "project name", "order", "title", "project title", "gig", "gig title", "project"],
  order_date: ["order date", "date", "start date", "date of order"],
  client_name: ["client", "client name", "customer", "buyer", "user", "username", "client username", "profile name"],
  assigned_to: ["assign", "assigned", "responsible", "assigned to", "by"],
  developer: ["developer", "dev", "assigned developer"],
  website_link: ["website", "website link", "link", "url", "site url"],
  project_type: ["project type", "type", "category", "service", "gig type"],
  delivery_deadline: ["delivery deadline", "deadline", "due date", "delivery date", "due"],
  gross_amount: ["gross amount", "gross", "amount", "order value", "price", "total", "quoted amount"],
  fee_percent: ["fee percent", "fee %", "commission %", "fiverr fee"],
  bonus: ["bonus", "tips", "tip"],
  status: ["status", "order status", "project status"],
  priority: ["priority"],
  progress: ["progress", "% progress"],
  notes: ["notes", "comments", "remarks", "note"],
  title: ["title", "bid title", "project", "proposal", "job title"],
  description: ["description", "details", "job description", "details of job"],
  platform: ["platform", "source", "marketplace"],
  stage: ["stage", "status", "pipeline"],
  amount: ["amount", "quoted amount", "bid amount", "price", "value", "budget"],
  connects_spent: ["connects", "connects spent", "connects used"],
  source_url: ["source url", "url", "link", "bid link", "conversation link", "conversation url", "job url"],
  next_follow_up: ["next follow up", "next follow-up", "follow up", "next action", "followup"],
  name: ["name", "client name", "buyer", "full name", "customer name"],
  email: ["email", "email address", "contact email"],
  company: ["company", "business", "organization", "company name"],
  username: ["username", "fiverr username", "upwork username", "user"],
  category: ["category", "service category", "niche"],
};

function autoMap(headers: string[], fields: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalized = headers.map((h) => h.toLowerCase().trim());
  for (const field of fields) {
    const synonyms = SYNONYMS[field] ?? [field];
    let match: string | null = null;
    for (const syn of synonyms) {
      const idx = normalized.indexOf(syn);
      if (idx !== -1) {
        match = headers[idx]!;
        break;
      }
      const partial = normalized.find((h) => h.includes(syn));
      if (partial) {
        match = headers[normalized.indexOf(partial)]!;
        break;
      }
    }
    if (match) mapping[field] = match;
  }
  return mapping;
}

export function ImportWizard({ importRuns }: { importRuns: Array<{ id: string; entity_type: string; file_name: string; imported_rows: number; failed_rows: number; total_rows: number; created_at: string }> }) {
  const [entityType, setEntityType] = React.useState<ImportEntity>("projects");
  const [sheet, setSheet] = React.useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [importing, setImporting] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const def = FIELD_DEFS[entityType];
  const missingRequired = def.required.some((f) => !mapping[f]);

  async function handleFile(file: File) {
    if (parsing) return;
    setParsing(true);
    try {
      // Load the (large) spreadsheet parser on demand so it isn't part of the
      // initial page bundle — it is only needed once a file is chosen.
      const XLSX = await import("xlsx");
      const data = new Uint8Array(await file.arrayBuffer());
      // cellDates: true so Excel date-formatted cells arrive as Date objects
      // instead of raw serial numbers; server-side validation still handles
      // text dates and serials from other sources.
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]!];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      if (!json.length) {
        toast.error("No rows found in the first sheet");
        return;
      }
      const headers = Object.keys(json[0]!);
      setSheet({ fileName: file.name, headers, rows: json });
      setMapping(autoMap(headers, def.fields));
    } catch {
      toast.error("Could not parse that file. Try a .csv or .xlsx export.");
    } finally {
      setParsing(false);
    }
  }

  function reset() {
    setSheet(null);
    setMapping({});
    if (fileRef.current) fileRef.current.value = "";
  }

  async function runImport() {
    if (!sheet || missingRequired) return;
    setImporting(true);
    const mappedRows = sheet.rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [field, source] of Object.entries(mapping)) {
        out[field] = row[source] ?? null;
      }
      return out;
    });
    const result = await importRowsAction(entityType, sheet.fileName, mappedRows);
    setImporting(false);
    if (result.ok) {
      const imported = result.data?.imported ?? 0;
      const failed = result.data?.failed ?? 0;
      toast.success(`Imported ${imported} rows${failed ? `, ${failed} failed` : ""}`);
      if (failed) {
        const errors = result.data?.errors ?? [];
        const more = Math.max(0, failed - errors.length);
        toast.error(
          `Failed rows: ${errors.map((e) => `#${e.row} ${e.error}`).join(" · ")}${more ? ` · +${more} more` : ""}`,
        );
      }
      reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" /> Load your spreadsheets
          </CardTitle>
          <CardDescription>
            Import your historical order sheets, bid trackers and Fiverr nurture lists (.xlsx, .xls,
            .csv). We&apos;ll auto-match the columns you already use.
          </CardDescription>
        </CardHeader>        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Data type</p>
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v as ImportEntity);
                  if (sheet) setMapping(autoMap(sheet.headers, FIELD_DEFS[v as ImportEntity].fields));
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="projects">Projects / Orders</SelectItem>
                  <SelectItem value="opportunities">Bids / Pre-sales</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="cursor-pointer">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={parsing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button asChild variant="outline" disabled={parsing}>
                <span>
                  {parsing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet />
                  )}
                  {parsing ? "Parsing…" : "Choose file"}
                </span>
              </Button>
            </label>
          </div>

          {!sheet && (
            <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              <Table2 className="mx-auto mb-2 h-6 w-6" />
              Pick a file from your Google Sheets / Excel exports. Only the first sheet is read.
            </div>
          )}
        </CardContent>
      </Card>

      {sheet && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">{sheet.fileName}</CardTitle>
              <CardDescription>
                {sheet.rows.length} rows · columns: {sheet.headers.join(", ")}
              </CardDescription>
            </div>
            <Badge variant="secondary">{def.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Column mapping</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {def.fields.map((field) => {
                  const required = def.required.includes(field);
                  return (
                    <div key={field} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 truncate text-xs">
                        {FIELD_LABELS[field] ?? field}
                        {required && <span className="text-destructive"> *</span>}
                      </span>
                      <Select
                        value={mapping[field] ?? "ignore"}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [field]: v === "ignore" ? "" : v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">(skip)</SelectItem>
                          {sheet.headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Preview</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {def.fields
                        .filter((f) => mapping[f])
                        .map((f) => (
                          <th key={f} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">
                            {FIELD_LABELS[f]}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {def.fields
                          .filter((f) => mapping[f])
                          .map((f) => (
                            <td key={f} className="max-w-[180px] truncate px-2 py-1.5">
                              {(() => {
                                const v = row[mapping[f]!];
                                return v instanceof Date
                                  ? v.toISOString().slice(0, 10)
                                  : String(v ?? "");
                              })()}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={runImport} disabled={importing || missingRequired}>
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Import {sheet.rows.length} rows
              </Button>
            </div>
            {missingRequired && (
              <p className="text-right text-xs text-destructive">
                Map the required field{def.required.length > 1 ? "s" : ""} ({def.required.map((r) => FIELD_LABELS[r]).join(", ")}) to import.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import history</CardTitle>
          <CardDescription>Past spreadsheet imports and their outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          {importRuns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <div className="space-y-2">
              {importRuns.map((run) => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{run.file_name}</span>
                    <Badge variant="secondary" className="capitalize">
                      {run.entity_type}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {run.imported_rows} imported · {run.failed_rows} failed · {run.total_rows} total
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
