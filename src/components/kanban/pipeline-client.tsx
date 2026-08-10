"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { DealDialog } from "@/components/kanban/deal-dialog";
import { Button } from "@/components/ui/button";
import { STAGE_META } from "@/lib/constants";
import { moveOpportunityAction, deleteOpportunityAction } from "@/app/actions";
import type { Opportunity, OpportunityStage } from "@/lib/types";
import type { PipelineData } from "@/lib/pipeline";

export type { PipelineData };

export function PipelineClient({ data }: { data: PipelineData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [groups, setGroups] = React.useState(data.groups);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Opportunity | null>(null);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true);
    }
  }, [searchParams]);

  const applyLocalMove = (id: string, from: OpportunityStage, to: OpportunityStage) => {
    setGroups((g) => {
      const opp = g[from].find((o) => o.id === id);
      if (!opp) return g;
      return {
        ...g,
        [from]: g[from].filter((o) => o.id !== id),
        [to]: [...g[to], { ...opp, stage: to }],
      };
    });
  };

  const handleMove = async (id: string, from: OpportunityStage, to: OpportunityStage) => {
    applyLocalMove(id, from, to);
    const result = await moveOpportunityAction(id, to);
    if (!result.ok) {
      applyLocalMove(id, to, from); // revert
      toast.error(result.error);
      return false;
    }
    toast.success(`Moved to ${STAGE_META[to].label}`);
    return true;
  };

  const handleDelete = async (opp: Opportunity) => {
    if (!window.confirm(`Delete "${opp.title}"? This cannot be undone.`)) return;
    const result = await deleteOpportunityAction(opp.id);
    if (result.ok) {
      setGroups((g) => ({ ...g, [opp.stage]: g[opp.stage].filter((o) => o.id !== opp.id) }));
      toast.success("Deal deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Add deal
        </Button>
      </div>

      <KanbanBoard
        groups={groups}
        currency={data.currency}
        onMove={handleMove}
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      <DealDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) router.replace("/pipeline");
        }}
        clients={data.clients}
      />

      <DealDialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        clients={data.clients}
        opportunity={editing}
      />
    </>
  );
}
