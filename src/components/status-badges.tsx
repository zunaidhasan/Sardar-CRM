"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import {
  BID_STATUS_META,
  FOLLOWUP_STATUS_META,
  INVOICE_STATUS_META,
  PLATFORM_META,
  PRIORITY_META,
  PROJECT_STATUS_META,
  STAGE_META,
} from "@/lib/constants";
import type {
  BidStatus,
  FollowupStatus,
  InvoiceStatus,
  OpportunityStage,
  Platform,
  Priority,
  ProjectStatus,
} from "@/lib/types";

// Fallbacks for values that don't map to a known enum (e.g. imported rows
// with odd or mixed-case statuses). Prevents a single bad row from crashing
// an entire page.
const UNKNOWN_BADGE = {
  label: "Unknown",
  badge: "bg-muted text-muted-foreground border-border",
};
const UNKNOWN_PLATFORM = { label: "Unknown", color: "bg-slate-500" };
const UNKNOWN_STAGE = { label: "Unknown", color: "bg-slate-400", dot: "bg-slate-500" };

export function PlatformBadge({ platform }: { platform: Platform }) {
  const { t } = useI18n();
  const meta = PLATFORM_META[platform] ?? UNKNOWN_PLATFORM;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white",
        meta.color,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
      {t(meta.label)}
    </span>
  );
}

export function StageBadge({ stage }: { stage: OpportunityStage }) {
  const { t } = useI18n();
  const meta = STAGE_META[stage] ?? UNKNOWN_STAGE;
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {t(meta.label)}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useI18n();
  const meta = PROJECT_STATUS_META[status] ?? UNKNOWN_BADGE;
  return (
    <Badge variant="outline" className={cn("border", meta.badge)}>
      {t(meta.label)}
    </Badge>
  );
}

export function BidStatusBadge({ status }: { status: BidStatus }) {
  const { t } = useI18n();
  const meta = BID_STATUS_META[status] ?? UNKNOWN_BADGE;
  return (
    <Badge variant="outline" className={cn("border", meta.badge)}>
      {t(meta.label)}
    </Badge>
  );
}

export function FollowupStatusBadge({ status }: { status: FollowupStatus }) {
  const { t } = useI18n();
  const meta = FOLLOWUP_STATUS_META[status] ?? UNKNOWN_BADGE;
  return (
    <Badge variant="outline" className={cn("border", meta.badge)}>
      {t(meta.label)}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useI18n();
  const meta = INVOICE_STATUS_META[status] ?? UNKNOWN_BADGE;
  return (
    <Badge variant="outline" className={cn("border", meta.badge)}>
      {t(meta.label)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n();
  const meta = PRIORITY_META[priority] ?? UNKNOWN_BADGE;
  return (
    <Badge variant="outline" className={cn("border", meta.badge)}>
      {t(meta.label)}
    </Badge>
  );
}
