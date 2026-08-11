"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/components/i18n-provider";
import { cn, initials } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  avatar?: { src?: string | null; name: string };
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  avatar,
  className,
}: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <div className={cn("mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{t(eyebrow)}</p>}
        <div className="flex items-center gap-3">
          {avatar && (
            <Avatar className="h-11 w-11 shrink-0">
              {avatar.src && <AvatarImage src={avatar.src} alt={avatar.name} />}
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials(avatar.name)}
              </AvatarFallback>
            </Avatar>
          )}
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.7rem]">{t(title)}</h1>
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{t(description)}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
