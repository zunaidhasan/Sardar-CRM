import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Optional: show a subtle background illustration behind the icon */
  illustration?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center",
        className,
      )}
    >
      {illustration && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
          {illustration}
        </div>
      )}
      {Icon && (
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 ring-1 ring-border/30">
          <Icon className="h-7 w-7 text-muted-foreground/70" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground/90">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
