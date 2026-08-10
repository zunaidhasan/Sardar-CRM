import type { Metadata } from "next";
import { isDemoMode } from "@/lib/utils";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <AuthForm mode="login" demoMode={isDemoMode()} />
    </div>
  );
}
