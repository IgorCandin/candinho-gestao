import Link from "next/link";
import { Dumbbell, PackagePlus } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyNewPurchaseGateway() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const canSupplements = access.role === "admin" || access.canWriteSupplements;
  const canFitness = access.role === "admin" || access.canWriteFitness;

  return <div className="company-workspace-v2 company-sale-gateway">
    <header className="company-workspace-head"><div><span>COMPANY · NOVO PEDIDO</span><h1>Para qual operação é a compra?</h1><p>O acompanhamento continuará reunido em Comprar e repor; aqui você escolhe somente o estoque que receberá os produtos.</p></div></header>
    <section className="company-sale-gateway-grid">
      {canSupplements ? <Link className="supplements" href="/company/compras/novo/suplementos"><PackagePlus/><span>Operação</span><h2>Suplementos</h2><p>Produtos, sabores, fornecedores e reposição por grupos equivalentes.</p><b>Criar pedido →</b></Link> : null}
      {canFitness ? <Link className="fitness" href="/company/compras/novo/fitness"><Dumbbell/><span>Operação</span><h2>Fitness</h2><p>Peças, variações de cor e tamanho e recebimento do estoque Fitness.</p><b>Criar pedido →</b></Link> : null}
    </section>
  </div>;
}
