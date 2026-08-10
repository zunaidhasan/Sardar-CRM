"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanCard, KanbanCardPreview, type KanbanOpp } from "@/components/kanban/kanban-card";
import { KANBAN_STAGES, STAGE_META } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import type { OpportunityStage } from "@/lib/types";

interface KanbanBoardProps {
  groups: Record<OpportunityStage, KanbanOpp[]>;
  currency: string;
  onEdit?: (opp: KanbanOpp) => void;
  onDelete?: (opp: KanbanOpp) => void;
  onMove: (id: string, from: OpportunityStage, to: OpportunityStage) => Promise<boolean>;
}

export function KanbanBoard({ groups, currency, onEdit, onDelete, onMove }: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeOpp = activeId ? Object.values(groups).flat().find((o) => o.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const id = String(active.id);
    const overStage = KANBAN_STAGES.find((s) => s === String(over.id));
    if (!overStage) return;

    const currentStage = KANBAN_STAGES.find((s) =>
      groups[s].some((o) => o.id === id),
    );
    if (!currentStage || currentStage === overStage) return;

    const ok = await onMove(id, currentStage, overStage);
    if (ok) setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="kanban-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
        {KANBAN_STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            opps={groups[stage]}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>{activeOpp ? <KanbanCardPreview opportunity={activeOpp} /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({
  stage,
  opps,
  currency,
  onEdit,
  onDelete,
}: {
  stage: OpportunityStage;
  opps: KanbanOpp[];
  currency: string;
  onEdit?: (opp: KanbanOpp) => void;
  onDelete?: (opp: KanbanOpp) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];
  const total = opps.reduce((s, o) => s + (o.stage === "won" || o.stage === "lost" ? 0 : o.amount), 0);

  return (
    <div className="flex w-[290px] shrink-0 flex-col rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
          <span className="text-sm font-semibold">{meta.label}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {opps.length}
          </span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{formatCurrency(total, currency)}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-inset ring-primary/30",
        )}
      >
        {opps.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No deals"}
          </div>
        )}
        {opps.map((opp) => (
          <KanbanCard key={opp.id} opportunity={opp} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
