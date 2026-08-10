"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/actions";

interface AuthFormProps {
  demoMode: boolean;
  demoCredentials?: Array<{ username: string; role: string }>;
}

export function AuthForm({ demoMode, demoCredentials }: AuthFormProps) {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Enter your username and password");
      return;
    }
    setLoading(true);
    try {
      const result = await loginAction(username.trim(), password);
      if (!result.ok) throw new Error(result.error ?? "Login failed");
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <AppLogo size="lg" className="mb-1" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Sardar CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sardar IT&apos;s team workspace for Fiverr &amp; Upwork.
          </p>
        </div>
      </div>

      {demoMode && demoCredentials && demoCredentials.length > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm">
          <p className="flex items-center gap-1.5 font-medium text-primary">
            <Lock className="h-3.5 w-3.5" /> Demo workspace — seeded logins
          </p>
          <p className="text-muted-foreground">
            Every account shares the initial password{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sardar2026</code>. Change it
            anytime from Settings.
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {demoCredentials.map((c) => (
              <li key={c.username} className="flex items-center justify-between gap-2">
                <span>
                  <code className="rounded bg-muted px-1 py-0.5 font-medium">{c.username}</code>
                </span>
                <span className="capitalize">{c.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. zunaid"
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Accounts are provisioned by Sardar IT management. If you don&apos;t have login details yet,
        ask your General Manager or Project Manager.
      </p>
    </div>
  );
}
