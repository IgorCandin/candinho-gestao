import Link from "next/link";
import { Dumbbell, PackageSearch, Percent, ShoppingBag } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";

export default async function FitnessAppPage() {
  const access = await getCurrentUserAccess();
  if (!access.active || (!access.canAccessFitness && access.role !== "admin")) redirect("/fitness");
  const canSell = access.canWriteFitness || access.role === "admin";
  return <main className="fitness-simple-app"><header><Dumbbell/><div><span>CANDINHO FITNESS</span><h1>Operação rápida</h1><p>Somente o que a Giulia precisa para atender e vender.</p></div></header><section>{canSell ? <Link href="/fitness/vendas/nova"><ShoppingBag/><span>Nova venda</span><small>Registrar uma venda de forma direta.</small></Link> : null}<Link href="/fitness/produtos"><PackageSearch/><span>Produtos</span><small>Peças, tamanhos, cores e preços.</small></Link><Link href="/company/produtos?operacao=Fitness&visualizacao=promotions"><Percent/><span>Promoções</span><small>Ofertas Fitness ativas agora.</small></Link></section><p className="fitness-simple-app-note">Para estoque, compras, ajustes e relatórios, use a operação completa.</p></main>;
}
