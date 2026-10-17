import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") return NextResponse.json({ error: "Sem permissão para alterar cadastros." }, { status: 403 });
  let body: { operation?: unknown; phone?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  if (!body || (body.operation !== "Suplementos" && body.operation !== "Fitness")) return NextResponse.json({ error: "Informe a operação do cadastro." }, { status: 400 });
  const fitness = body.operation === "Fitness";
  if (fitness ? !access.canAccessFitness || !access.canWriteFitness : !access.canAccessSupplements || !access.canWriteSupplements) return NextResponse.json({ error: "Sem permissão para salvar o telefone nesta operação." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Cadastro inválido." }, { status: 400 });
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const digits = phone.replace(/\D/g, "");
  if (phone.length > 32 || !/^[+\d().\s-]+$/.test(phone) || digits.length < 10 || digits.length > 15) return NextResponse.json({ error: "Informe um telefone válido com DDD (10 a 15 dígitos)." }, { status: 400 });
  const db = await createClient();
  // Atomic condition: fill only a still-empty phone; never overwrite a concurrent edit.
  let update = db.from(fitness ? "fitness_customers" : "customers").update({ phone }).eq("id", id).or("phone.is.null,phone.eq.");
  if (!fitness) update = update.eq("active", true);
  const { data, error } = await update.select("id");
  if (error) return NextResponse.json({ error: "Não foi possível salvar o telefone. Confira a permissão e tente novamente." }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: "Este cadastro já foi atualizado ou não está disponível para edição. Atualize a fila." }, { status: 409 });
  revalidatePath("/company/clientes/telefones");
  revalidatePath("/company/clientes");
  revalidatePath("/company/escritorio");
  revalidatePath(fitness ? `/company/clientes/fitness/${id}` : `/company/clientes/${id}`);
  return NextResponse.json({ ok: true });
}
