import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser, fetchProjects, fetchClients, fetchTimeEntries } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ProjectsList } from "@/components/projects/projects-list";
import { GenericExportButton } from "@/components/generic-export-button";
import { PROJECT_COLUMNS } from "@/lib/generic-export";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Projects & Orders",
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const [projects, clients, timeEntries] = await Promise.all([
    fetchProjects(user.id),
    fetchClients(user.id),
    fetchTimeEntries(user.id),
  ]);
  const hoursByProject = new Map<string, number>();
  for (const e of timeEntries) {
    hoursByProject.set(e.project_id, (hoursByProject.get(e.project_id) ?? 0) + e.hours);
  }

  return (
    <div>
      <PageHeader
        title="Projects & Orders"
        description="Your monthly order tracking — deadlines, fees, developers and milestones."
        actions={<GenericExportButton data={projects} columns={PROJECT_COLUMNS} filename="projects" />}
      />
      <Suspense fallback={<TableSkeleton rows={5} cols={7} />}>
        <ProjectsList
          projects={projects}
          clients={clients}
          hoursByProject={hoursByProject}
          defaultFeePercent={user.profile?.default_fee_percent ?? 20}
          currency={user.profile?.currency ?? "USD"}
        />
      </Suspense>
    </div>
  );
}
