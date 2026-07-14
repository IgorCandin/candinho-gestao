import Link from "next/link";
import { CircleDollarSign, ClipboardClock, PackageCheck, WalletCards } from "lucide-react";
import { Badge } from "@/components/badge";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getPendingOrders } from "@/lib/data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

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
        description="Tudo o que ainda precisa ser entregue, recebido ou finalizado, com a data real do pedido ou da entrega."
        action={<Link className="button gold" href="/vendas?novo=venda"><CircleDollarSign size={16} />Nova venda</Link>}
      />

      <section className="grid pending-stats-grid">
        <StatCard label="Pedidos pendentes" value={String(orders.length)} note="Registros que exigem ação" icon={ClipboardClock} />
        <StatCard label="Para entregar" value={String(toDeliver)} note="Pedidos aguardando entrega" icon={PackageCheck} />
        <StatCard label="A receber" value={String(toReceive)} note="Pagamentos ainda pendentes" icon={WalletCards} />
        <StatCard label="Valor pendente" value={formatCurrency(total)} note="Soma dos pedidos em aberto" icon={CircleDollarSign} />
      </section>

      <article className="panel pending-orders-panel">
        <div className="panel-head">
          <div><h2>Lista de pedidos</h2><p>Ordenada do pedido mais recente para o mais antigo</p></div>
          <Link className="button ghost" href="/vendas">Abrir vendas</Link>
        </div>
        {orders.length === 0 ? (
          <div className="empty"><ClipboardClock size={26} /><strong>Nenhum pedido pendente</strong>Quando um pedido exigir entrega ou pagamento, ele aparecerá aqui.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Cliente</th><th>Produto</th><th>Data</th><th>Pagamento</th><th>Entrega</th><th>Origem</th><th>Total</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><div className="cell-main">{order.customer_name}</div><div className="cell-sub">Pedido em aberto</div></td>
                    <td>{order.product_summary ?? "—"}</td>
                    <td>{formatDateOnly(order.business_date)}</td>
                    <td><Badge value={order.payment_status} /></td>
                    <td><Badge value={order.delivery_status} /></td>
                    <td>{order.location_code}</td>
                    <td className="amount">{formatCurrency(order.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </>
  );
}
