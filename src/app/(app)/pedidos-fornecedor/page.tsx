import Link from "next/link";
import {
  Boxes,
  BrainCircuit,
  Building2,
  PackageCheck,
  Plus,
  Truck,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SupplierOrdersPagedTable } from "@/components/supplier-orders-paged-table";
import { getSupplierOrdersScaleSnapshot } from "@/lib/supplier-orders-scale-data";
import { formatCurrency } from "@/lib/format";

export default async function SupplierOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "history" ? "history" : "pending";
  const sort =
    params.sort === "supplier" || params.sort === "pending"
      ? params.sort
      : "date";
  const page = Number(params.page ?? 1);

  const snapshot = await getSupplierOrdersScaleSnapshot({
    tab,
    sort,
    page,
    pageSize: 30,
  });

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Compras"
        title="Pedidos de fornecedor"
        description="Acompanhe o que já foi comprado e use o planejamento inteligente para decidir o próximo pedido. O histórico agora é paginado no servidor."
        action={
          <div className="page-header-actions">
            <Link className="button ghost" href="/fornecedores">
              <Building2 size={16} />
              Fornecedores
            </Link>
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
          href="/pedidos-fornecedor?tab=pending"
          label="Pedidos em aberto"
          value={String(snapshot.pendingCount)}
          note="Pendentes ou parcialmente recebidos"
          icon={Truck}
        />
        <StatCard
          href="/pedidos-fornecedor?tab=pending"
          label="Unidades a caminho"
          value={String(snapshot.pendingUnits)}
          note="Saldo ainda não recebido"
          icon={Boxes}
        />
        <StatCard
          href="/pedidos-fornecedor?tab=pending"
          label="Vendas aguardando"
          value={String(snapshot.waitingSales)}
          note="Reservas que precisam de reposição"
          icon={PackageCheck}
        />
        <StatCard
          href="/pedidos-fornecedor?tab=pending"
          label="Valor em pedidos"
          value={formatCurrency(snapshot.pendingValue)}
          note={`${snapshot.receivedCount} pedidos recebidos no histórico`}
          icon={PackageCheck}
        />
      </section>

      <SupplierOrdersPagedTable
        orders={snapshot.orders}
        tab={snapshot.tab}
        sort={snapshot.sort}
        page={snapshot.page}
        pageSize={snapshot.pageSize}
        total={snapshot.total}
        totalPages={snapshot.totalPages}
        pendingCount={snapshot.pendingCount}
        historyCount={snapshot.historyCount}
      />
    </>
  );
}
