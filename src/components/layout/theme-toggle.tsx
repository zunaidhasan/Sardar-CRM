"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

/**
 * Shared light/dark toggle. Used in the app sidebar and on the login screen
 * so the theme can be switched before (or without) signing in.
 *
 * The icon depends on client-only theme state, so it renders a same-sized
 * empty button on first paint (server + first client render match) and only
 * shows the icon after mount — this avoids React hydration mismatches. The
 * aria-label is static for the same reason (no server/client divergence).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={cn("shrink-0", className)}
    >
      {mounted &&
        (resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
    </Button>
  );
}
