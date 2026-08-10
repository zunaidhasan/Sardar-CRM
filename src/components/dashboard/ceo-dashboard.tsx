"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  FolderKanban,
  GitPullRequestArrow,
  PieChart,
  Plus,
  Target,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Opportunity, Project, Invoice, TeamMember } from "@/lib/types";

const REVENUE_STATUSES = ["complete", "delivered"];
const PIPELINE_STAGES = ["lead", "proposal", "negotiation", "active"];

interface CeoDashboardProps {
  userName: string;
  currency: string;
  opportunities: Opportunity[];
  projects: Project[];
  invoices: Invoice[];
  teamMembers: TeamMember[];
}

export function CeoDashboard({
  userName,
  currency,
  opportunities,
  projects,
  invoices,
  teamMembers,
}: CeoDashboardProps) {
  const revenue = projects
    .filter((p) => REVENUE_STATUSES.includes(p.status))
    .reduce((sum, p) => sum + p.net_amount + p.bonus, 0);

  const pipelineValue = opportunities
    .filter((o) => PIPELINE_STAGES.includes(o.stage))
    .reduce((sum, o) => sum + o.amount, 0);

  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const pendingInvoiceAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);

  const decided = opportunities.filter((o) => o.stage === "won" || o.stage === "lost");
  const won = opportunities.filter((o) => o.stage === "won").length;
  const winRate = decided.length ? Math.round((won / decided.length) * 100) : 0;

  // Team performance: per active member, derive open deals / active projects / revenue.
  const activeMembers = teamMembers.filter((m) => m.is_active);
  const teamRows = activeMembers.map((m) => {
    const name = m.name;
    const openDeals = opportunities.filter(
      (o) => o.assigned_to === name && PIPELINE_STAGES.includes(o.stage),
    );
    const openPipeline = openDeals.reduce((s, o) => s + o.amount, 0);
    const activeProjects = projects.filter(
      (p) => p.assigned_to === name && !["complete", "cancelled", "delivered"].includes(p.status),
    );
    const completedProjects = projects.filter(
      (p) => p.assigned_to === name && REVENUE_STATUSES.includes(p.status),
    ).length;
    const memberRevenue = projects
      .filter((p) => p.assigned_to === name && REVENUE_STATUSES.includes(p.status))
      .reduce((s, p) => s + p.net_amount + p.bonus, 0);
    const wonDeals = opportunities.filter((o) => o.assigned_to === name && o.stage === "won").length;
    const decidedFor = opportunities.filter(
      (o) => o.assigned_to === name && (o.stage === "won" || o.stage === "lost"),
    );
    const memberWinRate = decidedFor.length ? Math.round((wonDeals / decidedFor.length) * 100) : 0;
    return {
      ...m,
      openDeals: openDeals.length,
      openPipeline,
      activeProjects: activeProjects.length,
      completedProjects,
      memberRevenue,
      wonDeals,
      memberWinRate,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company overview"
        title={`Welcome back, ${userName.split(" ")[0] ?? "there"}`}
        description="Agency-wide view of revenue, pipeline, and team performance across Fiverr & Upwork."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/proposals">
                <Plus /> AI Proposal
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pipeline?new=1">
                <Plus /> Add deal
              </Link>
            </Button>
          </>
        }
      />

      {/* Company KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(revenue, currency)}
          sub="Net after platform fees + bonuses"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Active Pipeline"
          value={formatCurrency(pipelineValue, currency)}
          sub="Quoted value in open stages"
          icon={Target}
        />
        <StatCard
          label="Pending Invoices"
          value={`${pendingInvoices.length}`}
          sub={formatCurrency(pendingInvoiceAmount, currency) + " outstanding"}
          icon={PieChart}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          sub={`${won} won of ${decided.length} decided`}
          icon={GitPullRequestArrow}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Team performance */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Team performance</CardTitle>
              <CardDescription>Deals and delivery by team member</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 text-right font-medium">Open deals</th>
                    <th className="pb-2 text-right font-medium">Pipeline</th>
                    <th className="pb-2 text-right font-medium">Active projects</th>
                    <th className="pb-2 text-right font-medium">Completed</th>
                    <th className="pb-2 text-right font-medium">Won</th>
                    <th className="pb-2 text-right font-medium">Win rate</th>
                    <th className="pb-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-muted-foreground">
                        No team members yet. Add them in Supabase (team_members table).
                      </td>
                    </tr>
                  )}
                  {teamRows.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">{initials(m.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{m.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                      </td>
                      <td className="py-3 text-right">{m.openDeals}</td>
                      <td className="py-3 text-right">{formatCurrency(m.openPipeline, currency)}</td>
                      <td className="py-3 text-right">{m.activeProjects}</td>
                      <td className="py-3 text-right">{m.completedProjects}</td>
                      <td className="py-3 text-right">{m.wonDeals}</td>
                      <td className="py-3 text-right">{m.memberWinRate}%</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(m.memberRevenue, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Common tasks, one click away</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickAction href="/pipeline?new=1" icon={Plus}>
                Add a deal / bid
              </QuickAction>
              <QuickAction href="/projects?new=1" icon={FolderKanban}>
                New project / order
              </QuickAction>
              <QuickAction href="/clients?new=1" icon={UserRound}>
                Add client
              </QuickAction>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button asChild variant="outline" className="justify-start">
      <Link href={href}>
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </Link>
    </Button>
  );
}
