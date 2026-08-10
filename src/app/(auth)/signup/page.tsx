import type { Metadata } from "next";
import { isDemoMode } from "@/lib/utils";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <AuthForm mode="signup" demoMode={isDemoMode()} />
    </div>
  );
}
