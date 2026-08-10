import type { Metadata } from "next";
import { requireUser, fetchTemplates } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { TemplatesList } from "@/components/templates/templates-list";

export const metadata: Metadata = {
  title: "Email Templates",
};

export default async function TemplatesPage() {
  const user = await requireUser();
  const templates = await fetchTemplates(user.id);

  return (
    <div>
      <PageHeader
        title="Email Templates"
        description="Reusable follow-up, nurture and delivery messages for your clients."
      />
      <TemplatesList templates={templates} />
    </div>
  );
}
