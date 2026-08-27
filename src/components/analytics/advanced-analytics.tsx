"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, Target } from "lucide-react";
import { CURRENCY_SYMBOL, PLATFORM_META, PROJECT_STATUS_META } from "@/lib/constants";
import type { Client, Invoice, Opportunity, Project, TeamMember } from "@/lib/types";

interface AdvancedAnalyticsProps {
  opportunities: Opportunity[];
  projects: Project[];
  invoices: Invoice[];
  clients: Client[];
  teamMembers: TeamMember[];
  currency: string;
}

const PIE_COLORS = ["#14a800", "#1dbf73", "#8b5cf6", "#f59e0b", "#64748b", "#ec4899"];

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  boxShadow: "0 6px 20px rgb(0 0 0 / 0.15)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

function money(symbol: string, v: number) {
  return `${symbol}${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;
}

export function AdvancedAnalytics({
  opportunities,
  projects,
  invoices,
  clients,
  teamMembers,
  currency,
}: AdvancedAnalyticsProps) {
  const sym = CURRENCY_SYMBOL[currency] ?? "$";

  // --- Revenue by Platform ---
  const revenueByPlatform = Object.entries(
    projects.reduce(
      (acc, p) => {
        // Match platform from opportunities
        const opp = opportunities.find((o) => o.id === p.opportunity_id);
        const platform = opp?.platform ?? "direct";
        acc[platform] = (acc[platform] ?? 0) + (p.net_amount ?? 0);
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).map(([name, value]) => ({ name: PLATFORM_META[name as keyof typeof PLATFORM_META]?.label ?? name, value: Math.round(value) }));

  // --- Average Deal Size ---
  const wonDeals = opportunities.filter((o) => o.stage === "won");
  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((sum, o) => sum + o.amount, 0) / wonDeals.length
      : 0;

  // --- Sales Cycle Length (days from lead to won) ---
  const wonWithDates = wonDeals.filter((o) => o.created_at);
  const avgSalesCycle =
    wonWithDates.length > 0
      ? wonWithDates.reduce((sum, o) => {
          const created = new Date(o.created_at);
          const now = new Date();
          return sum + Math.round((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / wonWithDates.length
      : 0;

  // --- Team Performance ---
  const teamPerf = teamMembers.map((tm) => {
    const memberProjects = projects.filter(
      (p) => p.assigned_to === tm.name || p.developer === tm.name,
    );
    const memberOpps = opportunities.filter((o) => o.assigned_to === tm.name);
    const revenue = memberProjects.reduce((sum, p) => sum + (p.net_amount ?? 0), 0);
    const won = memberOpps.filter((o) => o.stage === "won").length;
    const total = memberOpps.length;
    const hours = memberProjects.length * 20; // Estimate from projects
    return {
      name: tm.name,
      role: tm.role,
      orders: memberProjects.length,
      revenue: Math.round(revenue),
      winRate: total > 0 ? Math.round((won / total) * 100) : 0,
      totalOpps: total,
    };
  });

  // --- Monthly Revenue Trend ---
  const monthlyRevenue = invoices
    .filter((i) => i.status === "paid" && i.paid_at)
    .reduce(
      (acc, inv) => {
        const month = inv.paid_at!.slice(0, 7);
        acc[month] = (acc[month] ?? 0) + inv.amount;
        return acc;
      },
      {} as Record<string, number>,
    );
  const revenueTrend = Object.entries(monthlyRevenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }));

  // --- Pipeline Distribution ---
  const stageCounts = opportunities.reduce(
    (acc, o) => {
      acc[o.stage] = (acc[o.stage] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const pipelineDistribution = Object.entries(stageCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // --- Expense summary ---
  const totalExpenses = projects.reduce((sum, p) => sum + (p.fee_amount ?? 0), 0);
  const totalRevenue = projects.reduce((sum, p) => sum + (p.gross_amount ?? 0), 0);
  const totalNet = projects.reduce((sum, p) => sum + (p.net_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">{money(sym, avgDealSize)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From {wonDeals.length} won deal{wonDeals.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Sales Cycle</p>
                <p className="text-2xl font-bold">{Math.round(avgSalesCycle)} days</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Lead to close
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">
                  {opportunities.length > 0
                    ? Math.round(
                        (wonDeals.length / opportunities.length) * 100,
                      )
                    : 0}
                  %
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {wonDeals.length} won of {opportunities.length} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold">
                  {totalRevenue > 0
                    ? Math.round(((totalNet - totalExpenses) / totalRevenue) * 100)
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Net after fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Revenue by Platform */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Platform</CardTitle>
            <CardDescription>Net revenue from completed orders</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByPlatform}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {revenueByPlatform.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [money(sym, Number(value)), "Revenue"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {revenueByPlatform.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{entry.name}:</span>
                  <span className="font-medium">{money(sym, entry.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly paid revenue over time</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [money(sym, Number(value)), "Revenue"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
            <CardDescription>Active deals by stage</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [Number(value), "Deals"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pipelineDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Orders, revenue, and win rate by team member</CardDescription>
          </CardHeader>
          <CardContent>
            {teamPerf.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No team members found
              </p>
            ) : (
              <div className="space-y-3">
                {teamPerf.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.name}</p>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {member.role}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{member.orders} orders</span>
                        <span>{money(sym, member.revenue)} revenue</span>
                        <span>{member.winRate}% win rate</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{money(sym, member.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
