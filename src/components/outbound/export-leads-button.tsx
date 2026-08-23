"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export-to-sheets";
import type { Client } from "@/lib/types";

// ---------------------------------------------------------------------------
// Export Leads Button
//
// One-click CSV export of filtered outbound leads. The CSV includes all
// relevant columns and can be opened in Google Sheets or Excel.
// ---------------------------------------------------------------------------

export function ExportLeadsButton({ leads }: { leads: Client[] }) {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = () => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }
    setExporting(true);
    try {
      downloadCSV(leads);
      toast.success(`${leads.length} leads exported to CSV`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
