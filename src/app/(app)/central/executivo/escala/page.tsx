import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Database,
  MessageSquareText,
  PackageOpen,
  RefreshCcw,
  ShoppingBag,
  Users,
  Webhook,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  getCurrentUserAccess,
  getScaleHealthSnapshot,
} from "@/lib/data";

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "pt-BR",
  ).format(value);
}

function HealthCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number;
  note: string;
  icon: typeof Activity;
}) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p>{label}</p>
          <h2>
            {formatNumber(
              value,
            )}
          </h2>
        </div>
        <Icon size={19} />
      </div>
      <div className="panel-body">
        <p className="muted">
          {note}
        </p>
      </div>
    </article>
  );
}

export default async function ScaleHealthPage() {
  const [access, snapshot] =
    await Promise.all([
      getCurrentUserAccess(),
      getScaleHealthSnapshot(),
    ]);

  if (!access.canManageUsers) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        eyebrow="Sala do Dono"
        title="Saúde de escala"
        description="Leitura operacional para acompanhar o crescimento das tabelas que mais tendem a aumentar com o uso diário."
        action={
          <div className="page-header-actions">
            <Link
              className="button ghost"
              href="/central/executivo"
            >
              <ArrowLeft
                size={16}
              />
              Sala do Dono
            </Link>
          </div>
        }
      />

      <section className="grid stats-grid">
        <HealthCard
          label="Vendas"
          value={snapshot.sales}
          note={`${formatNumber(snapshot.sale_items)} item(ns) de venda`}
          icon={ShoppingBag}
        />

        <HealthCard
          label="Clientes"
          value={snapshot.customers}
          note="Base comercial principal"
          icon={Users}
        />

        <HealthCard
          label="Movimentações"
          value={
            snapshot.inventory_movements
          }
          note={`${formatNumber(snapshot.inventory_history)} registro(s) no histórico legado`}
          icon={RefreshCcw}
        />

        <HealthCard
          label="Movimentações Fitness"
          value={
            snapshot.fitness_inventory_movements
          }
          note={`${formatNumber(snapshot.fitness_purchase_orders)} pedido(s) de compra`}
          icon={PackageOpen}
        />

        <HealthCard
          label="Mensagens Central"
          value={
            snapshot.central_messages
          }
          note="Mensagens registradas na operação omnichannel"
          icon={MessageSquareText}
        />

        <HealthCard
          label="Webhooks"
          value={
            snapshot.central_webhook_events
          }
          note="Eventos recebidos pelas integrações"
          icon={Webhook}
        />

        <HealthCard
          label="Auditoria"
          value={
            snapshot.audit_events
          }
          note="Eventos de rastreabilidade do ERP"
          icon={Database}
        />
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Como usar esta tela
            </h2>
            <p>
              Ela não altera dados.
            </p>
          </div>
          <Activity size={19} />
        </div>

        <div className="panel-body sale-detail-list">
          <div className="sale-detail-line">
            <span>
              Ficha do cliente
            </span>
            <strong>
              Otimizada por customer_id
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>
              Navegação anterior/próximo
            </span>
            <strong>
              Calculada no banco
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>
              Índices operacionais
            </span>
            <strong>
              Aplicados
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>
              Snapshot gerado
            </span>
            <strong>
              {new Date(
                snapshot.generated_at,
              ).toLocaleString(
                "pt-BR",
                {
                  timeZone:
                    "America/Sao_Paulo",
                },
              )}
            </strong>
          </div>
        </div>
      </article>
    </>
  );
}
