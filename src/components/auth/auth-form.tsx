"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "signup";
  demoMode: boolean;
}

export function AuthForm({ mode, demoMode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createBrowserSupabase();
    if (!supabase) {
      toast.error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // Create the profile row so RLS works for the fresh user
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: name || email.split("@")[0],
            currency: "USD",
            default_fee_percent: 20,
          });
        }
        toast.success("Account created. Welcome to Sardar CRM!");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <AppLogo size="lg" className="mb-1" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isLogin ? "Sign in to Sardar CRM" : "Create your workspace"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin
              ? "Sardar IT's team workspace for Fiverr & Upwork."
              : "Free to start. Your team's data stays yours."}
          </p>
        </div>
      </div>

      {demoMode && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          <p className="font-medium">Demo mode is active.</p>
          <p className="text-muted-foreground">
            No Supabase credentials configured yet. Explore the full app with seeded demo data, and
            switch between CEO and Executive views from the sidebar.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Enter demo workspace
          </Button>
        </div>
      )}

      {!demoMode && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sardar Ahmed"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLogin ? "Sign in" : "Create account"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isLogin ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
