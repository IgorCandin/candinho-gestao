import Link from "next/link";
import { Boxes, BrainCircuit, PackageCheck, Plus, Truck } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { SupplierOrdersTable } from "@/components/supplier-orders-table";
import { StatCard } from "@/components/stat-card";
import { getSupplierOrderSummaries } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

export default async function SupplierOrdersPage() {
  const orders = await getSupplierOrderSummaries();
  const pending = orders.filter((order) => ["pending", "partial"].includes(order.status));
  const received = orders.filter((order) => order.status === "received");
  const pendingUnits = pending.reduce((sum, order) => sum + order.pending_units, 0);
  const pendingValue = pending.reduce((sum, order) => sum + order.order_total, 0);
  const waitingSales = pending.reduce((sum, order) => sum + order.waiting_sales_count, 0);

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Compras"
        title="Pedidos de fornecedor"
        description="Acompanhe o que já foi comprado e use o planejamento inteligente para decidir o próximo pedido."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/pedidos-fornecedor/planejamento">
              <BrainCircuit size={16} />
              Planejar compras
            </Link>
            <Link className="button gold" href="/pedidos-fornecedor/novo">
              <Plus size={16} />
              Novo pedido
            </Link>
          </div>
        }
      />

      <section className="stats-grid supplier-stats-grid">
        <StatCard
          href="/pedidos-fornecedor"
          label="Pedidos em aberto"
          value={String(pending.length)}
          note="Pendentes ou parcialmente recebidos"
          icon={Truck}
        />
        <StatCard
          href="/pedidos-fornecedor"
          label="Unidades a caminho"
          value={String(pendingUnits)}
          note="Saldo ainda não recebido"
          icon={Boxes}
        />
        <StatCard
          href="/pedidos-fornecedor"
          label="Vendas aguardando"
          value={String(waitingSales)}
          note="Reservas que precisam de reposição"
          icon={PackageCheck}
        />
        <StatCard
          href="/pedidos-fornecedor"
          label="Valor em pedidos"
          value={formatCurrency(pendingValue)}
          note={`${received.length} pedidos no histórico`}
          icon={PackageCheck}
        />
      </section>

      <SupplierOrdersTable orders={orders} />
    </>
  );
}
