import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnvironment } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const cacheHeaders = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  let env;
  try {
    env = getSupabaseEnvironment();
  } catch {
    // Public forms can still render and validate without configured credentials.
    cacheHeaders.forEach((value, key) => response.headers.set(key, value));
    return response;
  }
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => cacheHeaders.set(key, value));
      },
    },
  });
  // Verification also refreshes expired tokens before rendering Server Components.
  await supabase.auth.getClaims();
  cacheHeaders.forEach((value, key) => response.headers.set(key, value));
  return response;
}
