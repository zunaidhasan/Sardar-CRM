"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS = [
  { keys: ["1"], action: "Set status → New" },
  { keys: ["2"], action: "Set status → Contacted" },
  { keys: ["3"], action: "Set status → Replied" },
  { keys: ["4"], action: "Set status → Meeting" },
  { keys: ["5"], action: "Set status → Proposal" },
  { keys: ["6"], action: "Set status → Won" },
  { keys: ["7"], action: "Set status → Lost" },
  { keys: ["H"], action: "Set score → High" },
  { keys: ["M"], action: "Set score → Medium" },
  { keys: ["L"], action: "Set score → Low" },
  { keys: ["F"], action: "Open follow-up date picker" },
  { keys: ["R"], action: "Open website review dialog" },
  { keys: ["C"], action: "Copy personalized email" },
  { keys: ["S"], action: "Send email (if configured)" },
  { keys: ["Esc"], action: "Clear selection" },
  { keys: ["?"], action: "Show this help" },
];

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{s.action}</span>
              <div className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 text-xs font-mono font-medium text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground/60">
          Shortcuts work when the table is focused (not in a text input or dialog).
        </p>
      </DialogContent>
    </Dialog>
  );
}
