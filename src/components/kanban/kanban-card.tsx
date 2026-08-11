"use client";

import { useDraggable } from "@dnd-kit/core";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency, formatShortDate, countdownLabel } from "@/lib/utils";
import { STAGE_META, PLATFORM_META, BID_STATUS_META } from "@/lib/constants";
import type { Opportunity } from "@/lib/types";

export type KanbanOpp = Opportunity & { client_name?: string | null };

export interface KanbanCardProps {
  opportunity: KanbanOpp;
  onEdit?: (opp: KanbanOpp) => void;
  onDelete?: (opp: KanbanOpp) => void;
}

export function KanbanCard({ opportunity: opp, onEdit, onDelete }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opp.id,
  });

  const platformMeta = PLATFORM_META[opp.platform];
  const followUp = opp.next_follow_up ? countdownLabel(opp.next_follow_up) : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={cn(
        "group relative cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">{opp.type === "bid" ? "Upwork bid" : "Pre-sales quote"}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white",
              platformMeta.color,
            )}
          >
            {opp.platform === "fiverr" ? "Fiverr" : opp.platform === "upwork" ? "Upwork" : "Direct"}
          </span>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                  aria-label="Deal actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <DropdownMenuItem onSelect={() => onEdit(opp)}>Edit deal</DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem className="text-destructive" onSelect={() => onDelete(opp)}>
                    Delete deal
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug">{opp.title}</p>

      {opp.amount > 0 && (
        <p className="mb-2 text-sm font-semibold text-primary">
          {formatCurrency(opp.amount, opp.currency)}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          {opp.status && (
            <span className="truncate text-[11px] text-muted-foreground">
              {BID_STATUS_META[opp.status].label}
            </span>
          )}
          {followUp && (
            // suppressHydrationWarning: the urgent flag derives from Date.now()
            // and can differ between server render and client hydration.
            <span
              suppressHydrationWarning
              className={cn(
                "text-[11px]",
                followUp.urgent ? "font-medium text-rose-500" : "text-muted-foreground",
              )}
            >
              Follow-up {formatShortDate(opp.next_follow_up)}
            </span>
          )}
        </div>
        {opp.connects_spent > 0 && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {opp.connects_spent}c
          </span>
        )}
      </div>

      {opp.client_name && (
        <div className="mt-2 border-t pt-2">
          <span className="truncate text-[11px] text-muted-foreground">{opp.client_name}</span>
        </div>
      )}
    </div>
  );
}

// A compact card body used inside the drag overlay & deal dialog previews.
export function KanbanCardPreview({ opportunity: opp }: KanbanCardProps) {
  return (
    <div className="w-[270px] rounded-lg border bg-card p-3 shadow-lg">
      <KanbanCardContent opp={opp} />
    </div>
  );
}

function KanbanCardContent({ opp }: { opp: KanbanOpp }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", STAGE_META[opp.stage].dot)} />
        <span className="text-xs text-muted-foreground">{STAGE_META[opp.stage].label}</span>
      </div>
      <p className="text-sm font-medium">{opp.title}</p>
      {opp.amount > 0 && (
        <p className="text-sm font-semibold text-primary">{formatCurrency(opp.amount, opp.currency)}</p>
      )}
    </div>
  );
}
