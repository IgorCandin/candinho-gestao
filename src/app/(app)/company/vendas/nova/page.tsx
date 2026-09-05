import Link from "next/link";
import { Dumbbell, ShoppingBasket } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CompanyNewSaleGateway() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const canSupplements = access.role === "admin" || access.canWriteSupplements;
  const canFitness = access.role === "admin" || access.canWriteFitness;

  return <div className="company-workspace-v2 company-sale-gateway">
    <header className="company-workspace-head"><div><span>COMPANY · NOVA VENDA</span><h1>O que será vendido?</h1><p>O cliente continua sendo da Company. Escolha apenas qual operação movimentará produtos, estoque e financeiro nesta venda.</p></div></header>
    <section className="company-sale-gateway-grid">
      {canSupplements ? <Link className="supplements" href="/company/vendas/nova/suplementos"><ShoppingBasket/><span>Operação</span><h2>Suplementos</h2><p>Produtos, sabores, reservas e estoque da Candinho Suplementos.</p><b>Começar venda →</b></Link> : null}
      {canFitness ? <Link className="fitness" href="/company/vendas/nova/fitness"><Dumbbell/><span>Operação</span><h2>Fitness</h2><p>Peças, tamanhos, cores e estoque da Candinho Fitness.</p><b>Começar venda →</b></Link> : null}
    </section>
  </div>;
}
