"use client";

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

export interface AnalyticsSeries {
  revenueByPlatform: Array<{ name: string; value: number }>;
  winRateOverTime: Array<{ month: string; winRate: number; decided: number }>;
  revenueTrend: Array<{ month: string; revenue: number }>;
  sellerPerformance: Array<{ name: string; orders: number; revenue: number }>;
  developerPerformance: Array<{ name: string; orders: number; revenue: number }>;
  pipelineDistribution: Array<{ name: string; value: number }>;
  currencySymbol: string;
}

const PIE_COLORS = ["#14a800", "#1dbf73", "#8b5cf6", "#f59e0b", "#64748b", "#ec4899"];

function money(symbol: string, v: number) {
  return `${symbol}${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`;
}

export function AnalyticsCharts({ data }: { data: AnalyticsSeries }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Revenue by platform</CardTitle>
          <CardDescription>Net revenue from completed orders</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.revenueByPlatform}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name} (${money(data.currencySymbol, value as number)})`}
              >
                {data.revenueByPlatform.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => money(data.currencySymbol, Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly revenue trend</CardTitle>
          <CardDescription>Net after fees, last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => money(data.currencySymbol, v)} />
              <Tooltip formatter={(v) => money(data.currencySymbol, Number(v))} />
              <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Win rate over time</CardTitle>
          <CardDescription>Decided deals per month</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.winRateOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="winRate" name="Win rate" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline distribution</CardTitle>
          <CardDescription>Open deal value by stage</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.pipelineDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => money(data.currencySymbol, v)} />
              <Tooltip formatter={(v) => money(data.currencySymbol, Number(v))} />
              <Bar dataKey="value" name="Value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Performance by seller account</CardTitle>
          <CardDescription>Orders and revenue per Fiverr / Upwork seller profile</CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTable rows={data.sellerPerformance} symbol={data.currencySymbol} />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Performance by team member</CardTitle>
          <CardDescription>Orders and revenue per developer / assignee</CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTable rows={data.developerPerformance} symbol={data.currencySymbol} />
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceTable({ rows, symbol }: { rows: Array<{ name: string; orders: number; revenue: number }>; symbol: string }) {
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No data yet.</p>}
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm font-medium">{r.name}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-primary/80"
              style={{ width: `${(r.revenue / max) * 100}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{r.orders} orders</span>
          <span className="w-16 shrink-0 text-right text-sm font-semibold">
            {money(symbol, r.revenue)}
          </span>
        </div>
      ))}
    </div>
  );
}
