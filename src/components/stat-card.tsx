import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconClassName?: string;
  trend?: { label: string; positive?: boolean };
}

export function StatCard({ label, value, sub, icon: Icon, iconClassName, trend }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-primary" aria-hidden />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className="mt-2 truncate text-[1.7rem] font-bold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.positive === undefined
                  ? "text-muted-foreground"
                  : trend.positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
              )}
            >
              {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            iconClassName,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
