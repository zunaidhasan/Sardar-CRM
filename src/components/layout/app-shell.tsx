"use client";

import * as React from "react";
import { Menu, Search } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalSearch } from "@/components/global-search";
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
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Global search */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

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

      {/* Desktop search trigger */}
      <div className="fixed right-4 top-3 z-30 hidden lg:block">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none rounded border bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
        </Button>
      </div>

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
