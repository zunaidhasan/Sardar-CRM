"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  userName: string | null;
  avatarUrl?: string | null;
  isDemo: boolean;
  role?: TeamRole;
}

export function AppShell({ children, userName, avatarUrl, isDemo, role }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar lg:block">
        <AppSidebar userName={userName} avatarUrl={avatarUrl} isDemo={isDemo} role={role} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r bg-sidebar shadow-xl">
            <AppSidebar
              userName={userName}
              avatarUrl={avatarUrl}
              isDemo={isDemo}
              role={role}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <AppLogo size="sm" />
          <span className="text-sm font-semibold">Sardar CRM</span>
        </div>      </header>

      <div
        className={cn(
          "min-h-screen transition-[padding]",
          "lg:pl-64",
        )}
      >
        <main className="mx-auto w-full max-w-[1400px] p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
