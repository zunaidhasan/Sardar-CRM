import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser, fetchOpportunities, fetchClients } from "@/lib/data";
import { buildPipelineData } from "@/lib/pipeline";
import { PageHeader } from "@/components/page-header";
import { PipelineClient } from "@/components/kanban/pipeline-client";
import { BidToWinAnalyzer } from "@/components/kanban/bid-to-win";
import { KanbanSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Pipeline",
};

export default async function PipelinePage() {
  const user = await requireUser();
  const [opportunities, clients] = await Promise.all([
    fetchOpportunities(user.id),
    fetchClients(user.id),
  ]);

  const data = buildPipelineData(opportunities, clients, user.profile?.currency ?? "USD");

  return (
    <div>
      <PageHeader
        title="Deal Pipeline"
        description="Track Upwork bids and Fiverr pre-sales from lead to won. Drag cards to update stages."
      />
      <BidToWinAnalyzer opportunities={opportunities} />
      <Suspense fallback={<KanbanSkeleton columns={6} />}>
        <PipelineClient data={data} />
      </Suspense>
    </div>
  );
}
