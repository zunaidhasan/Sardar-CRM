"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyticsSeries } from "@/components/analytics/analytics-charts";

// recharts is heavy (~110 kB) — keep it out of the initial page payload and
// load it on the client only, after paint. Wrapped in a client component
// because ssr:false is not allowed with next/dynamic in Server Components.
const AnalyticsCharts = dynamic(
  () =>
    import("@/components/analytics/analytics-charts").then(
      (m) => m.AnalyticsCharts,
    ),
  {
    ssr: false,
    loading: ChartsSkeleton,
  },
);

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-72 rounded-xl" />
      ))}
    </div>
  );
}

export function AnalyticsChartsLoader({ data }: { data: AnalyticsSeries }) {
  return <AnalyticsCharts data={data} />;
}
