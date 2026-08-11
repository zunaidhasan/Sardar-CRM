"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  FolderKanban,
  GitPullRequestArrow,
  Plus,
  Target,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useI18n } from "@/components/i18n-provider";
import { PlatformBadge, StageBadge, ProjectStatusBadge } from "@/components/status-badges";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { STAGE_META, PROJECT_STATUS_META } from "@/lib/constants";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { ActivityFeedItem } from "@/lib/activity-feed";
import type { Opportunity, Project, FollowUp } from "@/lib/types";

const REVENUE_STATUSES = ["complete", "delivered"];
const PIPELINE_STAGES = ["lead", "proposal", "negotiation", "active"];

interface ExecutiveDashboardProps {
  userName: string;
  avatarUrl?: string | null;
  currency: string;
  opportunities: Opportunity[];
  projects: Project[];
  followUps: FollowUp[];
  activities: ActivityFeedItem[];
}

export function ExecutiveDashboard({
  userName,
  avatarUrl,
  currency,
  opportunities,
  projects,
  followUps,
  activities,
}: ExecutiveDashboardProps) {
  const { t } = useI18n();
  // Everything is scoped to deals/projects assigned to this executive.
  const mine = (o: Opportunity) => o.assigned_to === userName;
  const myProjects = (p: Project) => p.assigned_to === userName;

  const myOpenDeals = opportunities.filter((o) => mine(o) && PIPELINE_STAGES.includes(o.stage));
  const myPipeline = myOpenDeals.reduce((s, o) => s + o.amount, 0);

  const myRevenue = projects
    .filter((p) => myProjects(p) && REVENUE_STATUSES.includes(p.status))
    .reduce((s, p) => s + p.net_amount + p.bonus, 0);

  const myActiveProjects = projects.filter(
    (p) => myProjects(p) && !["complete", "cancelled", "delivered"].includes(p.status),
  );

  const decided = opportunities.filter((o) => mine(o) && (o.stage === "won" || o.stage === "lost"));
  const myWon = opportunities.filter((o) => mine(o) && o.stage === "won").length;
  const myWinRate = decided.length ? Math.round((myWon / decided.length) * 100) : 0;

  // Follow-ups tied to this executive's deals
  const myFollowUps = followUps.filter((f) => {
    if (!f.opportunity_id) return false;
    const opp = opportunities.find((o) => o.id === f.opportunity_id);
    return opp ? mine(opp) : false;
  });
  const upcomingFollowUps = myFollowUps
    .filter((f) => f.status !== "complete" && f.scheduled_at)
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1));

  const firstName = userName.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My workspace"
        title={`${t("Welcome back")}, ${firstName}`}
        description="Deals, projects, and follow-ups assigned to you."
        avatar={{ src: avatarUrl, name: userName }}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/pipeline?new=1">
                <Plus /> {t("Add deal")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/pipeline">
                <Target /> {t("View pipeline")}
              </Link>
            </Button>
          </>
        }
      />

      {/* Personal KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("My Pipeline")}
          value={formatCurrency(myPipeline, currency)}
          sub={`${myOpenDeals.length} open deals`}
          icon={CircleDollarSign}
        />
        <StatCard
          label={t("Active Projects")}
          value={`${myActiveProjects.length}`}
          sub="In progress or in review"
          icon={FolderKanban}
        />
        <StatCard
          label={t("My Revenue")}
          value={formatCurrency(myRevenue, currency)}
          sub="Net after fees + bonuses"
          icon={Target}
        />
        <StatCard
          label={t("My Win Rate")}
          value={`${myWinRate}%`}
          sub={`${myWon} won of ${decided.length} decided`}
          icon={GitPullRequestArrow}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* My deals */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("My deals")}</CardTitle>
              <CardDescription>Active opportunities you own</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/pipeline">
                {t("View all")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {myOpenDeals.length === 0 && (
              <p className="text-sm text-muted-foreground">No open deals assigned to you.</p>
            )}
            {myOpenDeals.slice(0, 5).map((o) => (
              <Link
                key={o.id}
                href={`/pipeline?deal=${o.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {STAGE_META[o.stage].label} · {formatCurrency(o.amount, currency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PlatformBadge platform={o.platform} />
                  <StageBadge stage={o.stage} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* My projects */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("My projects")}</CardTitle>
              <CardDescription>Delivery work you are handling</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/projects">
                {t("View all")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {myActiveProjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No active projects assigned to you.</p>
            )}
            {myActiveProjects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/projects?project=${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.project_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {PROJECT_STATUS_META[p.status].label} · Due {formatShortDate(p.delivery_deadline)}
                  </p>
                </div>
                <ProjectStatusBadge status={p.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity feed */}
        <ActivityFeed items={activities} avatarUrl={avatarUrl} userName={userName} limit={6} />
      </div>

      {/* My follow-ups */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("Upcoming follow-ups")}</CardTitle>
            <CardDescription>Deals that need your attention</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {upcomingFollowUps.length === 0 && (
            <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
          )}
          {upcomingFollowUps.slice(0, 6).map((f) => {
            const opp = opportunities.find((o) => o.id === f.opportunity_id);
            return (
              <Link
                key={f.id}
                href={`/pipeline?deal=${f.opportunity_id}`}
                className="flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{opp?.title ?? "Follow-up"}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {formatShortDate(f.scheduled_at!)}
                  </p>
                </div>
                {opp && <PlatformBadge platform={opp.platform} />}
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
