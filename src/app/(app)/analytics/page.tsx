import type { Metadata } from "next";
import {
  requireUser,
  fetchProjects,
  fetchOpportunities,
  fetchAccounts,
  fetchInvoices,
  fetchClients,
  fetchTeamMembers,
  fetchAllExpenses,
  fetchTimeEntries,
} from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { AnalyticsChartsLoader } from "@/components/analytics/analytics-charts-loader";
import { AdvancedAnalytics } from "@/components/analytics/advanced-analytics";
import { PipelineFunnel } from "@/components/analytics/pipeline-funnel";
import { ProfitabilityDashboard } from "@/components/analytics/profitability-dashboard";
import type { AnalyticsSeries } from "@/components/analytics/analytics-charts";
import { STAGE_META, CURRENCY_SYMBOL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Analytics",
};

const REVENUE_STATUSES = ["complete", "delivered"];
const PIPELINE_STAGES: Array<"lead" | "proposal" | "negotiation" | "active"> = ["lead", "proposal", "negotiation", "active"];

function monthLabel(date: string): string {
  return date.slice(0, 7);
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [projects, opportunities, accounts, invoices, clients, teamMembers, expenses, timeEntries] = await Promise.all([
    fetchProjects(user.id),
    fetchOpportunities(user.id),
    fetchAccounts(user.id),
    fetchInvoices(user.id),
    fetchClients(user.id),
    fetchTeamMembers(user.id),
    fetchAllExpenses(user.id),
    fetchTimeEntries(user.id),
  ]);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const currency = user.profile?.currency ?? "USD";
  const symbol = CURRENCY_SYMBOL[currency] ?? "$";

  // Revenue by platform
  const revenueByPlatform = new Map<string, number>();
  for (const p of projects) {
    if (!REVENUE_STATUSES.includes(p.status)) continue;
    const platform = p.account_id ? (accountById.get(p.account_id)?.platform ?? "direct") : "direct";
    revenueByPlatform.set(platform, (revenueByPlatform.get(platform) ?? 0) + p.net_amount + p.bonus);
  }

  // Revenue trend (last 6 months)
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const revenueTrend = months.map((m) => ({
    month: m,
    revenue: projects
      .filter((p) => p.order_date?.startsWith(m))
      .reduce((s, p) => s + p.net_amount + p.bonus, 0),
  }));

  // Win rate over time
  const winRateByMonth = new Map<string, { won: number; decided: number }>();
  for (const o of opportunities) {
    if (o.stage !== "won" && o.stage !== "lost") continue;
    const m = monthLabel(o.updated_at);
    const entry = winRateByMonth.get(m) ?? { won: 0, decided: 0 };
    entry.decided += 1;
    if (o.stage === "won") entry.won += 1;
    winRateByMonth.set(m, entry);
  }
  const winRateOverTime = months.map((m) => {
    const entry = winRateByMonth.get(m) ?? { won: 0, decided: 0 };
    return {
      month: m,
      winRate: entry.decided ? Math.round((entry.won / entry.decided) * 100) : 0,
      decided: entry.decided,
    };
  });

  // Pipeline distribution
  const pipelineDistribution = PIPELINE_STAGES.map((s) => ({
    name: STAGE_META[s].label,
    value: opportunities
      .filter((o) => o.stage === s)
      .reduce((sum, o) => sum + o.amount, 0),
  }));

  // Seller performance
  const sellerMap = new Map<string, { orders: number; revenue: number }>();
  for (const p of projects) {
    const name = p.account_id ? accountById.get(p.account_id)?.name ?? "Unassigned" : "Unassigned";
    const entry = sellerMap.get(name) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += p.net_amount + p.bonus;
    sellerMap.set(name, entry);
  }
  const sellerPerformance = Array.from(sellerMap.entries())
    .map(([name, v]) => ({ name, orders: v.orders, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  // Developer performance
  const devMap = new Map<string, { orders: number; revenue: number }>();
  for (const p of projects) {
    const name = p.developer ?? "Unassigned";
    const entry = devMap.get(name) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += p.net_amount + p.bonus;
    devMap.set(name, entry);
  }
  const developerPerformance = Array.from(devMap.entries())
    .map(([name, v]) => ({ name, orders: v.orders, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  const data: AnalyticsSeries = {
    revenueByPlatform: Array.from(revenueByPlatform.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value),
    })),
    winRateOverTime,
    revenueTrend,
    sellerPerformance,
    developerPerformance,
    pipelineDistribution,
    currencySymbol: symbol,
  };

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Revenue, win rates and performance across platforms, sellers and team."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AnalyticsChartsLoader data={data} />
        </div>
        <div>
          <PipelineFunnel opportunities={opportunities} currency={currency} />
        </div>
      </div>
      <div className="mt-6">
        <ProfitabilityDashboard
          projects={projects}
          expenses={expenses}
          timeEntries={timeEntries}
          currency={currency}
        />
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Advanced Analytics</h2>
        <AdvancedAnalytics
          opportunities={opportunities}
          projects={projects}
          invoices={invoices}
          clients={clients}
          teamMembers={teamMembers}
          currency={currency}
        />
      </div>
    </div>
  );
}
