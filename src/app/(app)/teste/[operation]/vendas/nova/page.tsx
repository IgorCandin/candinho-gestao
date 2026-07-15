import { notFound,redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TestLabSaleForm } from "@/components/test-lab-sale-form";
import { getCurrentUserAccess,getTestLabCustomers,getTestLabStock } from "@/lib/data";
import { parseTestLabOperation,testLabOperationLabel } from "@/lib/test-lab";
export default async function Page({params}:{params:Promise<{operation:string}>}){const{operation:raw}=await params;const operation=parseTestLabOperation(raw);if(!operation)notFound();const access=await getCurrentUserAccess();if(!access.canManageUsers)redirect("/dashboard");const[customers,products]=await Promise.all([getTestLabCustomers(operation),getTestLabStock(operation)]);return <><PageHeader eyebrow={`Área de Teste · ${testLabOperationLabel(operation)}`} title="Nova venda teste" description="Crie cenários sem tocar em clientes, vendas ou estoque reais."/><article className="panel"><div className="panel-head"><div><h2>Simular venda</h2><p>Os três produtos abaixo existem apenas no laboratório.</p></div></div><TestLabSaleForm operation={operation} customers={customers} products={products}/></article></>}
