import Link from "next/link";
import { ArrowRightLeft, Info } from "lucide-react";
import { redirect } from "next/navigation";
import { BatchInventoryTransfer } from "@/components/batch-inventory-transfer";
import { getCurrentUserAccess, getInventoryLocationOverview, getInventoryOverview, getSaleLocations } from "@/lib/data";

export default async function CompanyTransfersPage({ searchParams }: { searchParams: Promise<{ operacao?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const [products, locations, locationRows, params] = await Promise.all([getInventoryOverview(), getSaleLocations(), getInventoryLocationOverview(), searchParams]);
  const fitness = params.operacao === "fitness";
  return <div className="company-workspace-v2"><header className="company-workspace-head"><div><span>COMPANY · ESTOQUE</span><h1>Transferir estoque</h1><p>Escolha a operação antes de movimentar qualquer saldo.</p></div></header><div className="company-quote-operation-tabs"><Link className={!fitness ? "active" : ""} href="/company/produtos/transferencias?operacao=supplements">Suplementos</Link><Link className={fitness ? "active" : ""} href="/company/produtos/transferencias?operacao=fitness">Fitness</Link></div>{fitness ? <article className="panel"><div className="panel-body"><Info size={20}/><strong>O Fitness ainda tem apenas um ponto de estoque operacional.</strong><p>Transferir exige origem e destino físicos. Assim que houver uma segunda loja, depósito ou parceiro Fitness, esta mesma tela liberará a transferência por tamanho e cor. Até lá, use “Correção” para defeito/perda e “Contagem física” para conferir saldo — sem criar uma transferência falsa.</p><Link className="button ghost" href="/company/estoque?operacao=fitness"><ArrowRightLeft size={16}/> Abrir estoque Fitness</Link></div></article> : <BatchInventoryTransfer products={products} locations={locations} locationRows={locationRows}/>}</div>;
}
