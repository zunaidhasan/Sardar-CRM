"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { InstallButton } from "@/components/layout/install-button";
import { useI18n } from "@/components/i18n-provider";
import { NAV_MAIN, NAV_SECONDARY, type NavItem } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { signOutAction } from "@/app/actions";
import { initials } from "@/lib/utils";
import type { TeamRole } from "@/lib/types";

const ROLE_LABELS: Record<TeamRole, string> = {
  ceo: "CEO",
  executive: "Executive",
  developer: "Developer",
  designer: "Designer",
};

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const active =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {t(item.title)}
    </Link>
  );
}

interface AppSidebarProps {
  userName: string | null;
  avatarUrl?: string | null;
  isDemo: boolean;
  role?: TeamRole;
  onNavigate?: () => void;
}



export function AppSidebar({ userName, avatarUrl, isDemo, role, onNavigate }: AppSidebarProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-sidebar-foreground">
      <div className="flex flex-col items-start gap-1 px-2">
        <AppLogo size="lg" className="w-full" />
        <p className="mt-1.5 w-full text-center text-[13px] font-bold leading-tight tracking-wide text-sidebar-foreground">
          {t("One team, One dream")}
        </p>
        <a
          href="https://sardaritbd.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 block w-full text-center text-[11px] text-sidebar-foreground/60 hover:text-sidebar-primary"
        >
          sardaritbd.com
        </a>
      </div>

      {isDemo && (
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent px-3 py-2 text-xs text-sidebar-primary">
          {t("Demo mode active. Add Supabase env vars to go live.")}
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {t("Main")}
          </p>
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {t("Manage")}
          </p>
          {NAV_SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-3 border-t border-sidebar-border pt-4">
        <div className="flex items-center gap-3 rounded-lg px-2">
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName ?? "User"} />}
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
              {initials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{userName ?? "User"}</p>
            <Badge className="mt-0.5 bg-sidebar-accent px-1.5 py-0 text-[10px] text-sidebar-accent-foreground">
              {role ? t(ROLE_LABELS[role]) : isDemo ? "Demo" : "Pro"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
            <ThemeToggle className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          </div>
        </div>
        <InstallButton className="w-full justify-start text-sidebar-foreground/70" />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? t("Signing out…") : t("Sign out")}
        </Button>
      </div>
    </div>
  );
}
