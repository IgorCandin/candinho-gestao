import Link from "next/link";
import { MessageSquareText, Plus } from "lucide-react";
import { FitnessSalesTable } from "@/components/fitness-sales-table";
import { PageHeader } from "@/components/page-header";
import { getFitnessSales } from "@/lib/data";

export default async function FitnessSalesPage() {
  const sales = await getFitnessSales();

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Comercial"
        title="Vendas"
        description="Histórico operacional. Clique em qualquer ponto da linha para abrir a venda."
        action={
          <div className="panel-actions">
            <Link className="button ghost" href="/fitness/pos-venda">
              <MessageSquareText size={16}/> Pós-venda
            </Link>
            <Link className="button gold" href="/fitness/vendas/nova">
              <Plus size={16}/> Nova venda
            </Link>
          </div>
        }
      />
      <article className="panel">
        <FitnessSalesTable sales={sales}/>
      </article>
    </>
  );
}
