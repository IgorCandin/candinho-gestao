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
      <div><span>COMPANY · COMERCIAL</span><h1>Orçamentos</h1><p>Uma visão única das propostas. Ao criar, escolha a operação para usar sabores em Suplementos ou cor e tamanho na Fitness.</p></div>
      <div className="company-quotes-actions">
        {canSupplements ? <Link className="button company-quote-supplements" href="/company/orcamentos/novo/suplementos"><ShoppingBag size={16}/> Novo Suplementos</Link> : null}
        {canFitness ? <Link className="button company-quote-fitness" href="/company/orcamentos/novo/fitness"><Shirt size={16}/> Novo Fitness</Link> : null}
      </div>
    </header>

    {canSupplements ? <section className="company-quote-section supplements">
      <header><div><ShoppingBag size={18}/><span>Suplementos</span></div><strong>{supplements.length} orçamento(s)</strong></header>
      <article className="panel"><QuotesTable quotes={supplements} companyMode/></article>
    </section> : null}

    {canFitness ? <section className="company-quote-section fitness">
      <header><div><Shirt size={18}/><span>Fitness</span></div><strong>{fitnessResult.data?.length ?? 0} orçamento(s)</strong></header>
      <article className="panel"><FitnessQuotesTable rows={fitnessResult.data ?? []} companyMode/></article>
    </section> : null}

    {!canSupplements && !canFitness ? <div className="company-empty-state"><FileText size={24}/><strong>Sem acesso aos orçamentos</strong></div> : null}
  </div>;
}
