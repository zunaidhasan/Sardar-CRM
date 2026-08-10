import type { Metadata } from "next";
import { requireUser, fetchAutomations } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { AutomationsList } from "@/components/automations/automations-list";

export const metadata: Metadata = {
  title: "Automations",
};

export default async function AutomationsPage() {
  const user = await requireUser();
  const rules = await fetchAutomations(user.id);

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Save time by automating pipeline busywork. Rules fire live when a deal changes stage."
      />
      <AutomationsList rules={rules} />
    </div>
  );
}
