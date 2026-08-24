import { createServerClient } from "@supabase/ssr";

// Dynamically import next/headers to avoid Turbopack issues
// with server-only modules in the build pipeline.
async function getCookies() {
  const { cookies } = await import("next/headers");
  return cookies();
}

// Server-side Supabase client. Only instantiated when env vars are present.
export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await getCookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component -> safe to ignore middleware refresh
        }
      },
    },
  });
}
