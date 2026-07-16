import { CircleDollarSign, ClipboardClock, PackageCheck, WalletCards } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { PendingOrdersTable } from "@/components/pending-orders-table";
import { StatCard } from "@/components/stat-card";
import { getPendingOrders } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function PendingOrdersPage() {
  const orders = await getPendingOrders();
  const toDeliver = orders.filter((order) => order.delivery_status === "to_deliver").length;
  const toReceive = orders.filter((order) => order.payment_status === "receivable").length;
  const total = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Operação"
        title="Pedidos pendentes"
        description="Clique em qualquer venda para conferir os detalhes, registrar o recebimento ou marcar a entrega."
      />

      <section className="grid pending-stats-grid">
        <StatCard href="/pedidos-pendentes" label="Pedidos pendentes" value={String(orders.length)} note="Registros que exigem ação" icon={ClipboardClock} />
        <StatCard href="/pedidos-pendentes" label="Para entregar" value={String(toDeliver)} note="Pedidos aguardando entrega" icon={PackageCheck} />
        <StatCard href="/pedidos-pendentes" label="A receber" value={String(toReceive)} note="Pagamentos ainda pendentes" icon={WalletCards} />
        <StatCard href="/pedidos-pendentes" label="Valor pendente" value={formatCurrency(total)} note="Soma dos pedidos em aberto" icon={CircleDollarSign} />
      </section>

      <article className="panel pending-orders-panel">
        <div className="panel-head">
          <div><h2>Lista de pedidos</h2><p>Ordenada do pedido mais recente para o mais antigo</p></div>
        </div>
        {orders.length === 0 ? (
          <div className="empty"><ClipboardClock size={26} /><strong>Nenhum pedido pendente</strong>Quando um pedido exigir entrega ou pagamento, ele aparecerá aqui.</div>
        ) : (
          <PendingOrdersTable orders={orders} />
        )}
      </article>
    </>
  );
}
