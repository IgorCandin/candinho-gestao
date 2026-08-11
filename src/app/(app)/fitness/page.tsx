import Link from "next/link";
import { Suspense } from "react";
import {
  CircleDollarSign,
  PackageOpen,
  ShoppingBag,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { FitnessNexusHome } from "@/components/fitness-nexus-home";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  getCurrentUserAccess,
  getFitnessDashboard,
  getFitnessDashboardPendingSales,
  getFitnessDashboardRecentOrders,
} from "@/lib/data";
import { getFitnessNexusSnapshot } from "@/lib/fitness-nexus-data";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export default async function FitnessDashboardPage() {
  const [access, summary, sales, orders] = await Promise.all([
    getCurrentUserAccess(),
    getFitnessDashboard(),
    getFitnessDashboardPendingSales(),
    getFitnessDashboardRecentOrders(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness"
        title="Visão geral"
        description="Vendas, clientes, peças, estoque e reposições em uma operação separada da Suplementos."
        action={
          access.canWriteFitness ? (
            <Link className="button gold" href="/fitness/vendas/nova">
              <ShoppingBag size={16} />
              Nova venda
            </Link>
          ) : null
        }
      />

      <Suspense fallback={<FitnessNexusHomeLoading />}>
        <FitnessNexusHomeAsync />
      </Suspense>

      <section className="stats-grid">
        <StatCard
          href="/fitness/vendas"
          icon={ShoppingBag}
          label="Vendas no mês"
          value={String(summary.month_sales)}
          note={`${formatCurrency(summary.month_revenue)} em faturamento`}
        />
        <StatCard
          href="/fitness/vendas"
          icon={CircleDollarSign}
          label="Lucro no mês"
          value={formatCurrency(summary.month_profit)}
          note={`${formatCurrency(summary.receivable_total)} a receber`}
        />
        <StatCard
          href="/fitness/estoque"
          icon={Warehouse}
          label="Estoque disponível"
          value={String(summary.available_units)}
          note={`${summary.reserved_units} reservadas · ${summary.incoming_units} a caminho`}
        />
        <StatCard
          href="/fitness/clientes"
          icon={UsersRound}
          label="Clientes ativos"
          value={String(summary.active_customers)}
          note={`${summary.pending_delivery} entrega(s) · ${summary.pending_payment} pagamento(s) pendente(s)`}
        />
      </section>

      <section className="test-lab-quick-grid">
        <Link className="dashboard-action-card" href="/fitness/vendas">
          <span className="dashboard-action-icon orange">
            <ShoppingBag size={20} />
          </span>
          <div>
            <span>Comercial</span>
            <strong>{summary.month_sales}</strong>
            <small>Acompanhar vendas, pagamentos e entregas</small>
          </div>
        </Link>

        <Link className="dashboard-action-card" href="/fitness/estoque">
          <span className="dashboard-action-icon blue">
            <Warehouse size={20} />
          </span>
          <div>
            <span>Estoque</span>
            <strong>{summary.available_units}</strong>
            <small>
              {summary.attention_variants} variação(ões) pedindo atenção
            </small>
          </div>
        </Link>

        <Link className="dashboard-action-card" href="/fitness/pedidos">
          <span className="dashboard-action-icon blue">
            <PackageOpen size={20} />
          </span>
          <div>
            <span>Pedidos</span>
            <strong>{summary.open_orders}</strong>
            <small>Reposições e recebimentos</small>
          </div>
        </Link>
      </section>

      <section className="dashboard-two-column">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Vendas pendentes</h2>
              <p>O que ainda precisa receber ou entregar.</p>
            </div>
            <Link className="button ghost" href="/fitness/vendas">
              Ver todas
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Produtos</th>
                  <th>Data</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/fitness/vendas/${sale.id}`}
                      >
                        {sale.customer_name}
                      </Link>
                    </td>
                    <td>{sale.product_summary}</td>
                    <td>{formatDateOnly(sale.quoted_on)}</td>
                    <td>{formatCurrency(sale.total_amount)}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={4}>Nenhuma pendência comercial.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Pedidos recentes</h2>
              <p>Últimas reposições da Fitness.</p>
            </div>
            <Link className="button ghost" href="/fitness/pedidos">
              Ver todos
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Itens</th>
                  <th>Pendente</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        className="table-link"
                        href={`/fitness/pedidos/${order.id}`}
                      >
                        {order.supplier_name}
                      </Link>
                    </td>
                    <td>{order.product_summary}</td>
                    <td>{order.pending_units}</td>
                    <td>{formatCurrency(order.grand_total)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4}>Nenhum pedido registrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );
}

async function FitnessNexusHomeAsync() {
  const nexus = await getFitnessNexusSnapshot();
  return <FitnessNexusHome snapshot={nexus} />;
}

function FitnessNexusHomeLoading() {
  return (
    <section
      className="panel"
      aria-label="Carregando recomendações do Nexus"
    >
      <div className="panel-body">
        <small>
          O Nexus está analisando estoque e vendas sem travar a tela…
        </small>
      </div>
    </section>
  );
}
