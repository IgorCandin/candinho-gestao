import type { NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    const { NextResponse } = await import("next/server");
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
