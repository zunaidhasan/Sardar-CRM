"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  downloadGenericCSV,
  type ExportColumn,
} from "@/lib/generic-export";

interface GenericExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  label?: string;
}

export function GenericExportButton<T>({
  data,
  columns,
  filename,
  label = "Export CSV",
}: GenericExportButtonProps<T>) {
  const [exporting, setExporting] = React.useState(false);

  function handleExport() {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }
    setExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      downloadGenericCSV(data, columns, `${filename}-${date}.csv`);
      toast.success(`${data.length} rows exported to CSV`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
