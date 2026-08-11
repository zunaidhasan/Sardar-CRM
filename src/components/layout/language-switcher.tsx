"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * English / বাংলা language switcher. Shown in the app sidebar (next to the
 * theme toggle) and on the login screen so the language can be picked before
 * signing in. Selection persists in localStorage.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Language")}
          title={t("Language")}
          className={cn("shrink-0", className)}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => setLocale(l)}
            className={cn(l === locale && "font-semibold text-primary")}
          >
            <span className="flex-1">{LOCALE_LABELS[l]}</span>
            {mounted && l === locale && <span aria-hidden>✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
