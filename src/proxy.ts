import {
  NextResponse,
  type NextRequest,
} from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const pathname =
    request.nextUrl.pathname;

  // A Vitrine é totalmente pública. Antes, cada acesso à Vitrine
  // passava por getUser() (e, para quem tinha cookie, também pelas
  // permissões do ERP) antes de sequer renderizar a página.
  //
  // Isso adicionava uma ida desnecessária ao Supabase em cada clique.
  if (
    pathname === "/catalogo" ||
    pathname.startsWith("/catalogo/")
  ) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
