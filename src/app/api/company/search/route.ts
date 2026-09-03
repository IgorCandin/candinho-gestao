import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeTerm(value: string) {
  return value.replace(/[,%()]/g, " ").trim().slice(0, 80);
}

export async function GET(request: Request) {
  const query = safeTerm(new URL(request.url).searchParams.get("q") ?? "");
  if (query.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") return NextResponse.json({ error: "Sem acesso." }, { status: 403 });

  const searches: PromiseLike<unknown>[] = [];
  if (access.role === "admin" || access.canAccessSupplements) {
    searches.push(supabase.from("customers").select("id,name,city,phone").eq("active", true).ilike("name", `%${query}%`).order("name").limit(6));
  }
  if (access.role === "admin" || access.canAccessFitness) {
    searches.push(supabase.from("fitness_customers").select("id,name,city,phone").eq("active", true).ilike("name", `%${query}%`).order("name").limit(6));
  }

  const responses = await Promise.all(searches);
  const results: Array<{ id: string; name: string; detail: string; href: string; operation: "Suplementos" | "Fitness" }> = [];

  responses.forEach((raw, index) => {
    const response = raw as { data: Array<{ id: string; name: string; city: string | null; phone: string | null }> | null };
    const operation = (searches.length === 1 && !(access.role === "admin" || access.canAccessSupplements)) || index === 1 ? "Fitness" : "Suplementos";
    for (const row of response.data ?? []) {
      results.push({
        id: row.id,
        name: row.name,
        detail: [row.city, row.phone].filter(Boolean).join(" · ") || "Ficha do cliente",
        href: operation === "Fitness" ? `/fitness/clientes/${row.id}` : `/clientes/${row.id}`,
        operation,
      });
    }
  });

  return NextResponse.json({ results: results.slice(0, 10) }, { headers: { "Cache-Control": "private, no-store" } });
}
