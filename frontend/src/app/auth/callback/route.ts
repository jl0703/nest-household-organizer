import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Completes the OAuth (Google) sign-in flow: Supabase redirects here with a
// `code` query param after the provider redirect, which we exchange for a
// session cookie before sending the user on to their original destination.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/households/new";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("We couldn't complete Google sign-in. Please try again.")}`,
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
