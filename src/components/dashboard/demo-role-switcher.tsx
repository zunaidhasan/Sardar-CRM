"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { setDemoRoleCookie, getDemoRoleFromClient } from "@/lib/demo-role";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamRole } from "@/lib/types";

const ROLE_LABELS: Record<TeamRole, string> = {
  ceo: "CEO",
  executive: "Executive",
  developer: "Developer",
  designer: "Designer",
};

export function DemoRoleSwitcher({ currentRole }: { currentRole?: TeamRole }) {
  const router = useRouter();
  // No preview cookie yet -> show the signed-in user's effective role instead
  // of always defaulting to CEO (which used to lie to executives).
  const [role, setRole] = React.useState<TeamRole>(() =>
    getDemoRoleFromClient(currentRole),
  );

  function onSelect(next: TeamRole) {
    setRole(next);
    setDemoRoleCookie(next);
    router.refresh();
  }

  return (
    <div className="rounded-lg border bg-accent/40 px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <UserCog className="h-3.5 w-3.5" />
        Preview as
      </div>
      <Select value={role} onValueChange={(v) => onSelect(v as TeamRole)}>
        <SelectTrigger className="mt-1 h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ceo">Mamunur Roshid · {ROLE_LABELS.ceo}</SelectItem>
          <SelectItem value="executive">Zunaid Hasan · {ROLE_LABELS.executive}</SelectItem>
          <SelectItem value="developer">Rafi Ahmed · {ROLE_LABELS.developer}</SelectItem>
          <SelectItem value="designer">Sadia Rahman · {ROLE_LABELS.designer}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
