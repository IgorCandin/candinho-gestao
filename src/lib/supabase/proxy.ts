import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { FITNESS_SALES_EMAIL, MANAGER_EMAIL } from "@/lib/access";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/auth");
  const protectedPrefixes = [
    "/dashboard",
    "/suplementos",
    "/fitness",
    "/produtos",
    "/estoque",
    "/vendas",
    "/clientes",
    "/movimentacoes",
    "/configuracoes",
  ];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const email = user.email?.trim().toLowerCase() ?? "";
    const isSupplementRoute = ["/suplementos", "/produtos", "/estoque", "/vendas", "/clientes", "/movimentacoes"].some((prefix) => pathname.startsWith(prefix));
    const isFitnessRoute = pathname.startsWith("/fitness");
    const isManagerRoute = pathname.startsWith("/configuracoes");

    if (email === FITNESS_SALES_EMAIL && (isSupplementRoute || isManagerRoute)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/fitness";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (email !== MANAGER_EMAIL && email !== FITNESS_SALES_EMAIL && (isSupplementRoute || isFitnessRoute || isManagerRoute)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
