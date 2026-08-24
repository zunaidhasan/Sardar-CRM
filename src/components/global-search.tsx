"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  FileText,
  FolderKanban,
  Hash,
  LayoutDashboard,
  Mail,
  Rocket,
  Search,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Global Search / Command Palette
//
// Press Cmd+K (Mac) or Ctrl+K (Windows/Linux) to open.
// Searches across all CRM entities and provides quick navigation.
// ---------------------------------------------------------------------------

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  category: string;
}

const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: "Pipeline", href: "/pipeline", icon: <Workflow className="h-4 w-4" /> },
  { title: "Outbound Leads", href: "/outbound", icon: <Rocket className="h-4 w-4" /> },
  { title: "Clients", href: "/clients", icon: <Users className="h-4 w-4" /> },
  { title: "Projects & Orders", href: "/projects", icon: <FolderKanban className="h-4 w-4" /> },
  { title: "Invoices", href: "/invoices", icon: <FileText className="h-4 w-4" /> },
  { title: "Proposals (AI)", href: "/proposals", icon: <Hash className="h-4 w-4" /> },
  { title: "Analytics", href: "/analytics", icon: <Briefcase className="h-4 w-4" /> },
  { title: "Calendar", href: "/calendar", icon: <Calendar className="h-4 w-4" /> },
  { title: "Import Sheets", href: "/import", icon: <FileText className="h-4 w-4" /> },
  { title: "Email Templates", href: "/templates", icon: <Mail className="h-4 w-4" /> },
  { title: "Automations", href: "/automations", icon: <Workflow className="h-4 w-4" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter nav items by query
  const results = React.useMemo(() => {
    if (!query.trim()) {
      return NAV_ITEMS.map((item, i) => ({
        id: item.href,
        title: item.title,
        subtitle: `Navigate to ${item.title.toLowerCase()}`,
        href: item.href,
        icon: item.icon,
        category: "Pages",
      }));
    }
    const q = query.toLowerCase();
    return NAV_ITEMS
      .filter((item) => item.title.toLowerCase().includes(q))
      .map((item) => ({
        id: item.href,
        title: item.title,
        subtitle: `Navigate to ${item.title.toLowerCase()}`,
        href: item.href,
        icon: item.icon,
        category: "Pages",
      }));
  }, [query]);

  function handleSelect(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex].href);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((result, i) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  i === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50"
                )}
              >
                <span className="text-muted-foreground">{result.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{result.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60">{result.category}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span>Navigate with ↑↓ · Select with ↵</span>
          <span>
            Open with{" "}
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
