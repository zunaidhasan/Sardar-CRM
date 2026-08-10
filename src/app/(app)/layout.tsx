import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data";
import { AppShell } from "@/components/layout/app-shell";

// Authenticated routes must render per-request (the signed-in session decides
// what is shown). Static prerendering would try to render them without a
// session and fail with "Not authenticated".
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      userName={user.name ?? user.profile?.full_name ?? "User"}
      isDemo={user.isDemo}
      role={user.role}
    >
      {children}
    </AppShell>
  );
}
