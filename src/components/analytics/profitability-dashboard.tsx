"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { computeProjectProfitability, DEFAULT_HOURLY_RATE } from "@/lib/profitability";
import { formatCurrency } from "@/lib/utils";
import type { Project, ProjectExpense, TimeEntry } from "@/lib/types";

interface ProfitabilityDashboardProps {
  projects: Project[];
  expenses: ProjectExpense[];
  timeEntries: TimeEntry[];
  currency: string;
}

export function ProfitabilityDashboard({
  projects,
  expenses,
  timeEntries,
  currency,
}: ProfitabilityDashboardProps) {
  const rows = projects
    .filter((p) => p.status !== "cancelled")
    .map((p) => {
      const exp = expenses.filter((e) => e.project_id === p.id).reduce((s, e) => s + e.amount, 0);
      const hours = timeEntries
        .filter((t) => t.project_id === p.id)
        .reduce((s, t) => s + t.hours, 0);
      const profit = computeProjectProfitability({
        grossAmount: p.gross_amount,
        feeAmount: p.fee_amount,
        bonus: p.bonus,
        expenses: exp,
        billableHours: hours,
        hourlyRate: DEFAULT_HOURLY_RATE,
      });
      return { project: p, hours, ...profit };
    })
    .sort((a, b) => a.trueNet - b.trueNet);

  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.project.gross_amount;
      acc.net += r.trueNet;
      acc.fees += r.platformFee;
      acc.labor += r.laborCost;
      acc.expenses += r.expenseTotal;
      return acc;
    },
    { gross: 0, net: 0, fees: 0, labor: 0, expenses: 0 },
  );
  const margin = totals.gross === 0 ? 0 : Math.round((totals.net / totals.gross) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>True Profitability</CardTitle>
        <CardDescription>
          Net after platform fees, logged hours at ${DEFAULT_HOURLY_RATE}/h, and project expenses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Gross" value={formatCurrency(totals.gross, currency)} />
          <Kpi label="True net" value={formatCurrency(totals.net, currency)} />
          <Kpi label="Labor + costs" value={formatCurrency(totals.labor + totals.expenses, currency)} />
          <Kpi label="Margin" value={`${margin}%`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Project</th>
                <th className="py-2 pr-3 text-right font-semibold">Gross</th>
                <th className="py-2 pr-3 text-right font-semibold">Fees</th>
                <th className="py-2 pr-3 text-right font-semibold">Labor</th>
                <th className="py-2 pr-3 text-right font-semibold">Expenses</th>
                <th className="py-2 text-right font-semibold">True net</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((r) => (
                <tr key={r.project.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{r.project.project_name}</td>
                  <td className="py-2 pr-3 text-right">{formatCurrency(r.project.gross_amount, currency)}</td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">
                    {formatCurrency(r.platformFee, currency)}
                  </td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">
                    {formatCurrency(r.laborCost, currency)}
                  </td>
                  <td className="py-2 pr-3 text-right text-muted-foreground">
                    {formatCurrency(r.expenseTotal, currency)}
                  </td>
                  <td className={`py-2 text-right font-semibold ${r.trueNet < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    {formatCurrency(r.trueNet, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
