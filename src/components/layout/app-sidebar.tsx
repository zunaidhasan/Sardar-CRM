"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Moon, Sun } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { NAV_MAIN, NAV_SECONDARY, type NavItem } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DemoRoleSwitcher } from "@/components/dashboard/demo-role-switcher";
import { signOutAction } from "@/app/actions";
import { initials } from "@/lib/utils";
import type { TeamRole } from "@/lib/types";

const ROLE_LABELS: Record<TeamRole, string> = {
  ceo: "CEO",
  executive: "Executive",
  developer: "Developer",
  designer: "Designer",
};

interface AppSidebarProps {
  userName: string | null;
  isDemo: boolean;
  role?: TeamRole;
  onNavigate?: () => void;
}

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
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
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.title}
    </Link>
  );
}

export function AppSidebar({ userName, isDemo, role, onNavigate }: AppSidebarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-col items-start gap-1 px-2">
        <AppLogo size="lg" className="w-full" />
        <p className="mt-1.5 w-full text-center text-[13px] font-bold leading-tight tracking-wide text-foreground">
          “One team, One dream”
        </p>
        <a
          href="https://sardaritbd.com/"
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 block w-full text-center text-[11px] text-muted-foreground hover:text-primary"
        >
          sardaritbd.com
        </a>
      </div>

      {isDemo && (
        <div className="space-y-2">
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            Demo mode active. Add Supabase env vars to go live.
          </div>
          <DemoRoleSwitcher currentRole={role} />
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Main
          </p>
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Manage
          </p>
          {NAV_SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center gap-3 rounded-lg px-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials(userName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName ?? "User"}</p>
            <Badge variant="secondary" className="mt-0.5 px-1.5 py-0 text-[10px]">
              {role ? ROLE_LABELS[role] : isDemo ? "Demo" : "Pro"}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
