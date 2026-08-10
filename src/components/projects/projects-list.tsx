"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusBadge } from "@/components/status-badges";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { countdownLabel, cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Client, Project } from "@/lib/types";

interface ProjectsListProps {
  projects: Project[];
  clients: Client[];
  defaultFeePercent: number;
  currency: string;
}

function monthKey(date: string | null): string {
  if (!date) return "Unknown";
  return date.slice(0, 7); // YYYY-MM
}

export function ProjectsList({ projects, clients, defaultFeePercent, currency }: ProjectsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [month, setMonth] = React.useState<string>("all");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  const months = Array.from(new Set(projects.map((p) => monthKey(p.order_date)))).sort().reverse();

  const filtered = projects.filter((p) => {
    const q = query.toLowerCase();
    const matchesQ =
      !q ||
      p.project_name.toLowerCase().includes(q) ||
      (p.developer ?? "").toLowerCase().includes(q) ||
      (p.project_type ?? "").toLowerCase().includes(q);
    const matchesStatus = status === "all" || p.status === status;
    const matchesMonth = month === "all" || monthKey(p.order_date) === month;
    return matchesQ && matchesStatus && matchesMonth;
  });

  const totalNet = filtered.reduce((s, p) => s + p.net_amount + p.bonus, 0);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders..."
                className="pl-8"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(PROJECT_STATUS_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus /> New order
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} orders · Net after fees:{" "}
          <span className="font-semibold text-foreground">{formatCurrency(totalNet, currency)}</span>
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="hidden md:table-cell">Order date</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden xl:table-cell">Deadline</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No orders match your filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => {
              const cd = countdownLabel(p.delivery_deadline);
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/projects/${p.id}`} className="block max-w-[260px]">
                      <p className="truncate font-medium hover:text-primary">{p.project_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.developer ?? "—"} · {p.assigned_to ?? "—"}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(p.order_date)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {p.project_type ?? "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className={cn("text-xs", cd.urgent && "font-medium text-rose-500")}>
                      {formatDate(p.delivery_deadline)} · {cd.label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <ProjectStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex w-20 items-center gap-1.5">
                      <Progress value={p.progress} className="h-1.5 w-12" />
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.net_amount + p.bonus, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProjectDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) router.replace("/projects");
        }}
        clients={clients}
        defaultFeePercent={defaultFeePercent}
      />
    </>
  );
}
