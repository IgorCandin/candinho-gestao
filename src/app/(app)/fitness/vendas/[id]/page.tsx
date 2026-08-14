import Link from "next/link";
import {
  MessageSquareText,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { FitnessSaleActions } from "@/components/fitness-sale-actions";
import { PageHeader } from "@/components/page-header";
import { EntitySwipeNavigator } from "@/components/entity-swipe-navigator";
import {
  getEntitySwipeNavigation,
  getFitnessSaleDetails,
} from "@/lib/data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import type { FitnessSaleItem } from "@/lib/types";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sale, swipe] = await Promise.all([
    getFitnessSaleDetails(id),
    getEntitySwipeNavigation("fitness_sale", id),
  ]);

  if (!sale) notFound();

  const finished =
    sale.payment_status === "received" &&
    sale.delivery_status === "delivered";

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Setor de Vendas"
        title={sale.customer_name}
        description={`${formatDateOnly(
          sale.quoted_on,
        )} · ${sale.product_summary}`}
        action={
          <div className="panel-actions">
            <Link
              className="button ghost"
              href="/fitness/vendas"
            >
              <ShoppingBag size={16} />
              Setor de Vendas
            </Link>
            <Link
              className="button gold"
              href="/fitness/pos-venda"
            >
              <MessageSquareText size={16} />
              Pós-venda
            </Link>
          </div>
        }
      />

      <EntitySwipeNavigator
        previous={swipe.previous}
        next={swipe.next}
      />

      <section className="fitness-sale-status-grid">
        <article>
          <span>Pagamento</span>
          <strong>
            <Badge value={sale.payment_status} />
          </strong>
          <small>
            {sale.payment_method ||
              "Forma não informada"}
          </small>
        </article>
        <article>
          <span>Entrega</span>
          <strong>
            <Badge value={sale.delivery_status} />
          </strong>
          <small>{sale.status_label}</small>
        </article>
        <article>
          <span>Total da venda</span>
          <strong>
            {formatCurrency(sale.total_amount)}
          </strong>
          <small>
            Lucro {formatCurrency(sale.total_profit)}
          </small>
        </article>
      </section>

      <div className="fitness-sector-intro">
        <strong>
          {finished
            ? "Venda concluída; o próximo trabalho é relacionamento."
            : "A venda continua aberta enquanto houver pagamento ou entrega pendente."}
        </strong>
        <span>
          O ERP mantém cliente, venda, estoque e pós-venda no mesmo fluxo. Você não precisa recriar a cliente para continuar o atendimento.
        </span>
      </div>

      <div className="fitness-sale-operational-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Produtos da venda</h2>
              <p>
                Tamanho, cor, quantidade, reserva e preço em um só lugar.
              </p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Tamanho</th>
                  <th>Cor</th>
                  <th>Qtd.</th>
                  <th>Reservado</th>
                  <th>Preço</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item: FitnessSaleItem) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.size}</td>
                    <td>{item.color}</td>
                    <td>{item.quantity}</td>
                    <td>{item.quantity_reserved}</td>
                    <td>
                      {formatCurrency(item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Atualizar venda</h2>
              <p>
                Registre recebimento, entrega ou cancelamento sem procurar outra tela.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <FitnessSaleActions
              saleId={sale.id}
              generalStatus={sale.general_status}
              paymentStatus={sale.payment_status}
              deliveryStatus={sale.delivery_status}
            />
          </div>
        </article>
      </div>

      <section className="dashboard-two-column">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Informações</h2>
              <p>Dados complementares da venda.</p>
            </div>
            <UsersRound size={18} />
          </div>
          <div className="panel-body">
            <dl className="details-list">
              <div>
                <dt>Responsável</dt>
                <dd>{sale.responsible || "—"}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{sale.customer_phone || "—"}</dd>
              </div>
              <div>
                <dt>Data do orçamento</dt>
                <dd>
                  {formatDateOnly(sale.quoted_on)}
                </dd>
              </div>
              <div>
                <dt>Situação</dt>
                <dd>{sale.status_label}</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Relacionamento</h2>
              <p>
                A compra alimenta o histórico da cliente e o ciclo de pós-venda da Fitness.
              </p>
            </div>
            <MessageSquareText size={18} />
          </div>
          <div className="panel-body">
            <div className="fitness-finalize-next">
              <div>
                <strong>Histórico</strong>
                <span>Esta compra permanece ligada à cliente.</span>
              </div>
              <div>
                <strong>Pós-venda</strong>
                <span>O ciclo considera a compra mais recente para evitar contatos duplicados.</span>
              </div>
              <div>
                <strong>Próxima venda</strong>
                <span>Uma nova compra reaproveita a mesma identidade da Candinho Company.</span>
              </div>
            </div>

            <div
              className="panel-actions"
              style={{ marginTop: 12 }}
            >
              <Link
                className="button ghost"
                href="/fitness/clientes"
              >
                Ver clientes
              </Link>
              <Link
                className="button gold"
                href="/fitness/pos-venda"
              >
                Abrir pós-venda
              </Link>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
