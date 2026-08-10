import type { Metadata } from "next";
import { isDemoMode } from "@/lib/utils";
import { DEMO_LOGIN_CREDENTIALS } from "@/lib/db/demo-data";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  const demoMode = isDemoMode();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <AuthForm
        demoMode={demoMode}
        demoCredentials={demoMode ? DEMO_LOGIN_CREDENTIALS : undefined}
      />
    </div>
  );
}
