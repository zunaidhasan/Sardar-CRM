import type { TeamRole } from "@/lib/types";

// Client-safe demo persona helpers. Kept separate from the data layer so the
// (server-only) fs / next/headers imports in src/lib/data.ts never leak into
// client bundles.

const DEMO_ROLE_COOKIE = "sardar_demo_role";

const ROLES: TeamRole[] = ["ceo", "executive", "developer", "designer"];

export function isTeamRole(value: string | undefined | null): value is TeamRole {
  return !!value && (ROLES as string[]).includes(value);
}

export function setDemoRoleCookie(role: TeamRole): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_ROLE_COOKIE}=${role}; path=/; max-age=86400; samesite=lax`;
}

export function getDemoRoleFromClient(fallback: TeamRole = "ceo"): TeamRole {
  if (typeof document === "undefined") return fallback;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${DEMO_ROLE_COOKIE}=`));
  const value = match?.split("=")[1];
  return isTeamRole(value) ? value : fallback;
}
