import Link from "next/link";
import { Dumbbell, PackagePlus } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyNewProductGateway() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const canSupplements = access.role === "admin" || access.canWriteSupplements;
  const canFitness = access.role === "admin" || access.canWriteFitness;
  return <div className="company-workspace-v2 company-sale-gateway">
    <header className="company-workspace-head"><div><span>COMPANY · NOVO PRODUTO</span><h1>Qual operação receberá o produto?</h1><p>O cadastro e a consulta continuam dentro da Company. Escolha apenas se é Suplementos ou Fitness.</p></div></header>
    <section className="company-sale-gateway-grid">
      {canSupplements ? <Link className="supplements" href="/company/produtos/novo/suplementos"><PackagePlus/><span>Operação</span><h2>Suplementos</h2><p>Cadastro completo, sabores, tabela nutricional e preenchimento pelo Nexus.</p><b>Cadastrar produto →</b></Link> : null}
      {canFitness ? <Link className="fitness" href="/company/produtos/novo/fitness"><Dumbbell/><span>Operação</span><h2>Fitness</h2><p>Peças, cores, tamanhos, imagens e estoque por variação.</p><b>Cadastrar produto →</b></Link> : null}
    </section>
  </div>;
}
