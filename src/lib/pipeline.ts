import { KANBAN_STAGES } from "@/lib/constants";
import type { Client, Opportunity, OpportunityStage } from "@/lib/types";

export interface PipelineData {
  groups: Record<OpportunityStage, Array<Opportunity & { client_name?: string | null }>>;
  clients: Client[];
  currency: string;
}

export function buildPipelineData(
  opportunities: Opportunity[],
  clients: Client[],
  currency: string,
): PipelineData {
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const groups = Object.fromEntries(
    KANBAN_STAGES.map((stage) => [
      stage,
      opportunities
        .filter((o) => o.stage === stage)
        .map((o) => ({
          ...o,
          client_name: o.client_id ? clientById.get(o.client_id)?.name ?? null : null,
        }))
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    ]),
  ) as PipelineData["groups"];

  return { groups, clients, currency };
}
