"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { resetDemoDataAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const [loading, setLoading] = React.useState(false);
  async function handleReset() {
    if (!confirm("Reset all demo data back to the original sample?")) return;
    setLoading(true);
    const result = await resetDemoDataAction();
    setLoading(false);
    if (result.ok) {
      toast.success("Demo data reset");
      window.location.reload();
    } else {
      toast.error(result.error ?? "Failed to reset");
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={handleReset} disabled={loading} className="mt-4">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
      Reset demo data
    </Button>
  );
}
