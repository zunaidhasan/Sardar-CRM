import type { Metadata } from "next";
import { requireUser, fetchImportRuns } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { ImportWizard } from "@/components/import/import-wizard";

export const metadata: Metadata = {
  title: "Import",
};

export default async function ImportPage() {
  const user = await requireUser();
  const importRuns = await fetchImportRuns(user.id);
  return (
    <div>
      <PageHeader
        title="Import"
        description="Bring your existing Google Sheets data into Sardar CRM."
      />
      <ImportWizard importRuns={importRuns} />
    </div>
  );
}
