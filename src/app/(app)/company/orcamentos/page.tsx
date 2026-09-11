import Link from "next/link";
import { FileText, Shirt, ShoppingBag } from "lucide-react";
import { redirect } from "next/navigation";
import { FitnessQuotesTable } from "@/components/fitness-quotes-table";
import { QuotesTable } from "@/components/quotes-table";
import { getCurrentUserAccess, getQuotesHistory } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyQuotesPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");

  const canSupplements = access.role === "admin" || access.canAccessSupplements;
  const canFitness = access.role === "admin" || access.canAccessFitness;
  const supabase = await createClient();
  const [supplements, fitnessResult] = await Promise.all([
    canSupplements ? getQuotesHistory() : Promise.resolve([]),
    canFitness
      ? supabase.from("fitness_quotes_overview").select("*").order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (fitnessResult.error) throw new Error(fitnessResult.error.message);

  return <div className="company-workspace-v2 company-quotes-v2">
    <header className="company-workspace-heading company-quotes-heading">
      <div><span>COMPANY · GESTÃO</span><h1>Histórico de orçamentos</h1><p>Todos os orçamentos de Suplementos e Fitness, com acesso para cancelar, reabrir ou consultar a venda.</p></div>
      <div className="company-quotes-actions">
        {canSupplements ? <Link className="button company-quote-supplements" href="/company/orcamentos/novo/suplementos"><ShoppingBag size={16}/> Novo Suplementos</Link> : null}
        {canFitness ? <Link className="button company-quote-fitness" href="/company/orcamentos/novo/fitness"><Shirt size={16}/> Novo Fitness</Link> : null}
      </div>
    </header>

    <nav className="company-quote-operation-tabs" aria-label="Filtrar histórico por operação">
      <a href="#todos">Todos · {supplements.length + (fitnessResult.data?.length ?? 0)}</a>
      {canSupplements ? <a href="#suplementos">Suplementos · {supplements.length}</a> : null}
      {canFitness ? <a href="#fitness">Fitness · {fitnessResult.data?.length ?? 0}</a> : null}
    </nav>
    <span id="todos" className="company-anchor-target" />

    {canSupplements ? <section id="suplementos" className="company-quote-section supplements">
      <header><div><ShoppingBag size={18}/><span>Suplementos</span></div><strong>{supplements.length} orçamento(s)</strong></header>
      <article className="panel"><QuotesTable quotes={supplements} companyMode/></article>
    </section> : null}

    {canFitness ? <section id="fitness" className="company-quote-section fitness">
      <header><div><Shirt size={18}/><span>Fitness</span></div><strong>{fitnessResult.data?.length ?? 0} orçamento(s)</strong></header>
      <article className="panel"><FitnessQuotesTable rows={fitnessResult.data ?? []} companyMode/></article>
    </section> : null}

    {!canSupplements && !canFitness ? <div className="company-empty-state"><FileText size={24}/><strong>Sem acesso aos orçamentos</strong></div> : null}
  </div>;
}
