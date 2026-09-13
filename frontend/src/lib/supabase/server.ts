import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session via Next.js cookies().
 *
 * Writing cookies from a Server Component throws (Server Components cannot
 * set cookies); this is safe to ignore because `proxy.ts` refreshes the
 * session cookie on every request before Server Components run.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // Called from a Server Component - safe to ignore, see above.
          }
        },
      },
    },
  );
}
