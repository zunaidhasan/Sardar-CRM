import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser, fetchProjects, fetchClients } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ProjectsList } from "@/components/projects/projects-list";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Projects & Orders",
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, clients] = await Promise.all([
    fetchProjects(user.id),
    fetchClients(user.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Projects & Orders"
        description="Your monthly order tracking — deadlines, fees, developers and milestones."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ProjectsList
          projects={projects}
          clients={clients}
          defaultFeePercent={user.profile?.default_fee_percent ?? 20}
          currency={user.profile?.currency ?? "USD"}
        />
      </Suspense>
    </div>
  );
}
