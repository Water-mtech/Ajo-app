import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes reachable without a session.
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: don't put logic between createServerClient() and
  // supabase.auth.getUser() — an early return here can randomly log
  // users out (see Supabase's @supabase/ssr docs).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isApiPath = path.startsWith("/api/");

  // 1. Not signed in, hitting a protected route -> /login.
  // API routes get a plain 401 instead of an HTML redirect — a client
  // calling fetch().then(r => r.json()) would otherwise choke trying to
  // parse the /login page as JSON. Route handlers (e.g. /api/payout/draw)
  // also check auth themselves, so this is a fast-fail, not the only guard.
  if (!user && !isPublicPath) {
    if (isApiPath) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Already signed in, hitting /login or /signup -> bounce into the app
  if (user && (path.startsWith("/login") || path.startsWith("/signup"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // 3. /admin requires profiles.is_admin = true
  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
