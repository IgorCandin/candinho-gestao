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
    "/dashboard", "/suplementos", "/fitness", "/produtos", "/estoque", "/vendas", "/orcamentos", "/leads",
    "/clientes", "/movimentacoes", "/configuracoes", "/pedidos-pendentes", "/pedidos-fornecedor", "/parceiros", "/painel-cs", "/bank",
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
    let access = {
      active: true,
      can_access_supplements: email === MANAGER_EMAIL,
      can_access_fitness: email === MANAGER_EMAIL || email === FITNESS_SALES_EMAIL,
      can_access_bank: email === MANAGER_EMAIL,
      can_manage_users: email === MANAGER_EMAIL,
    };

    const { data } = await supabase.rpc("get_my_access");
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      access = {
        active: Boolean(row.active),
        can_access_supplements: Boolean(row.can_access_supplements),
        can_access_fitness: Boolean(row.can_access_fitness),
        can_access_bank: Boolean(row.can_access_bank),
        can_manage_users: Boolean(row.can_manage_users),
      };
    }

    const supplementPrefixes = [
      "/suplementos", "/produtos", "/estoque", "/vendas", "/orcamentos", "/leads", "/clientes", "/movimentacoes",
      "/pedidos-pendentes", "/pedidos-fornecedor", "/parceiros", "/painel-cs",
    ];
    const isSupplementRoute = supplementPrefixes.some((prefix) => pathname.startsWith(prefix));
    const isFitnessRoute = pathname.startsWith("/fitness");
    const isBankRoute = pathname.startsWith("/bank");
    const isManagerRoute = pathname.startsWith("/configuracoes");

    if (!access.active && pathname !== "/dashboard") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (isSupplementRoute && !access.can_access_supplements) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = access.can_access_fitness ? "/fitness" : "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (isFitnessRoute && !access.can_access_fitness) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = access.can_access_supplements ? "/suplementos" : access.can_access_bank ? "/bank" : "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (isBankRoute && !access.can_access_bank) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = access.can_access_supplements ? "/suplementos" : access.can_access_fitness ? "/fitness" : "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (isManagerRoute && !access.can_manage_users) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
