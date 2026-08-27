"use client";

import * as React from "react";
import { toast } from "sonner";
import { Workflow, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AutomationsList } from "@/components/automations/automations-list";
import { WorkflowCanvas } from "@/components/automations/workflow-canvas";
import { useI18n } from "@/components/i18n-provider";
import {
  createDefaultWorkflow,
  workflowToAutomationRules,
  type Workflow as WorkflowType,
} from "@/lib/workflow-builder";
import { saveAutomationAction } from "@/app/actions";
import type { AutomationRule } from "@/lib/types";

type ViewMode = "list" | "builder";

export function AutomationsPageClient({ rules }: { rules: AutomationRule[] }) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [builderWorkflow, setBuilderWorkflow] = React.useState<WorkflowType | null>(null);

  function handleOpenBuilder() {
    setBuilderWorkflow(createDefaultWorkflow());
    setViewMode("builder");
  }

  async function handleSaveWorkflow(workflow: WorkflowType) {
    const automationRules = workflowToAutomationRules(workflow);
    if (automationRules.length === 0) {
      toast.error("Workflow has no trigger → action paths");
      return;
    }

    let saved = 0;
    let failed = 0;
    for (const rule of automationRules) {
      const result = await saveAutomationAction(rule);
      if (result.ok) saved++;
      else failed++;
    }

    if (failed === 0) {
      toast.success(`Workflow saved! ${saved} automation rule${saved !== 1 ? "s" : ""} created.`);
    } else {
      toast.warning(`${saved} saved, ${failed} failed`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          <button
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" />
            List View
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "builder"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={handleOpenBuilder}
          >
            <Workflow className="h-3.5 w-3.5" />
            Visual Builder
          </button>
        </div>

        {viewMode === "list" && (
          <Button onClick={handleOpenBuilder} size="sm">
            <Workflow className="mr-1 h-3.5 w-3.5" />
            Open Builder
          </Button>
        )}
        {viewMode === "builder" && (
          <Button onClick={() => setViewMode("list")} variant="outline" size="sm">
            Back to List
          </Button>
        )}
      </div>

      {viewMode === "list" ? (
        <AutomationsList rules={rules} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/30 border p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Visual Builder:</strong> Drag nodes from the left palette onto the canvas.
              Connect output handles (●) to input handles to create flows. Click a node to configure it.
              Use conditions to branch logic based on deal value, platform, or status.
            </p>
          </div>
          <WorkflowCanvas
            initialWorkflow={builderWorkflow ?? undefined}
            onSave={handleSaveWorkflow}
          />
        </div>
      )}
    </div>
  );
}
