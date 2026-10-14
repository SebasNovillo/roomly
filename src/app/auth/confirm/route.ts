import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeDestination } from "@/features/auth/validation";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hash = params.get("token_hash");
  let destination = "/sign-in?error=confirmation";
  if (hash && hash.length <= 2048 && params.get("type") === "email") {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: hash, type: "email" });
      if (!error && data.session) destination = safeDestination(params.get("next"));
    } catch {
      // Never include token hashes, provider errors, or query strings in logs/errors.
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
