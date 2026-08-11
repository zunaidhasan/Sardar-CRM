import type { Metadata } from "next";
import { isDemoMode } from "@/lib/utils";
import { DEMO_LOGIN_CREDENTIALS } from "@/lib/db/demo-data";
import { AuthForm } from "@/components/auth/auth-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  const demoMode = isDemoMode();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      {/* Theme + language are available before login so users can pick the
          mode and language they are comfortable with from the first screen. */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-1.5">
        <LanguageSwitcher className="bg-background/60 backdrop-blur" />
        <ThemeToggle className="bg-background/60 backdrop-blur" />
      </div>
      <AuthForm
        demoMode={demoMode}
        demoCredentials={demoMode ? DEMO_LOGIN_CREDENTIALS : undefined}
      />
    </div>
  );
}
