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

  const searches: Array<{ kind: "customer" | "product"; operation: "Suplementos" | "Fitness"; request: PromiseLike<unknown> }> = [];
  if (access.role === "admin" || access.canAccessSupplements) {
    searches.push({ kind: "customer", operation: "Suplementos", request: supabase.from("customers").select("id,name,city,phone").eq("active", true).ilike("name", `%${query}%`).order("name").limit(6) });
    searches.push({ kind: "product", operation: "Suplementos", request: supabase.from("products").select("id,name,category,brand").eq("active", true).ilike("name", `%${query}%`).order("name").limit(6) });
  }
  if (access.role === "admin" || access.canAccessFitness) {
    searches.push({ kind: "customer", operation: "Fitness", request: supabase.from("fitness_customers").select("id,name,city,phone").eq("active", true).ilike("name", `%${query}%`).order("name").limit(6) });
    searches.push({ kind: "product", operation: "Fitness", request: supabase.from("fitness_products").select("id,name,category").eq("active", true).ilike("name", `%${query}%`).order("name").limit(6) });
  }

  const responses = await Promise.all(searches.map((search) => search.request));
  const results: Array<{ id: string; name: string; detail: string; href: string; operation: "Suplementos" | "Fitness"; kind: "customer" | "product" }> = [];

  responses.forEach((raw, index) => {
    const response = raw as { data: Array<{ id: string; name: string; city?: string | null; phone?: string | null; category?: string | null; brand?: string | null }> | null };
    const { operation, kind } = searches[index];
    for (const row of response.data ?? []) {
      results.push({
        id: row.id,
        name: row.name,
        detail: kind === "product" ? [row.category, row.brand].filter(Boolean).join(" · ") || "Produto" : [row.city, row.phone].filter(Boolean).join(" · ") || "Ficha do cliente",
        href: kind === "product" ? (operation === "Fitness" ? `/company/produtos/fitness/${row.id}` : `/company/produtos/${row.id}`) : (operation === "Fitness" ? `/fitness/clientes/${row.id}` : `/company/clientes/${row.id}`),
        operation, kind,
      });
    }
  });

  return NextResponse.json({ results: results.slice(0, 16) }, { headers: { "Cache-Control": "private, no-store" } });
}
