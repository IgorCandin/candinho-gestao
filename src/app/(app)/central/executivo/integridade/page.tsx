import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Boxes,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Handshake,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  getCommercialIntegritySnapshot,
  type CommercialIntegrityMetrics,
} from "@/lib/commercial-integrity-data";
import {
  getCurrentUserAccess,
} from "@/lib/data";

type MetricKey =
  keyof CommercialIntegrityMetrics;

function MetricLine({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="sale-detail-line">
      <span>
        {label}
        <small>{note}</small>
      </span>
      <strong
        className={
          value === 0
            ? "positive"
            : "warning-text"
        }
      >
        {value}
      </strong>
    </div>
  );
}

function MetricGroup({
  title,
  description,
  metrics,
  values,
}: {
  title: string;
  description: string;
  metrics: Array<{
    key: MetricKey;
    label: string;
    note: string;
  }>;
  values:
    CommercialIntegrityMetrics;
}) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <ShieldCheck
          size={19}
        />
      </div>

      <div className="panel-body sale-detail-list">
        {metrics.map(
          (item) => (
            <MetricLine
              key={item.key}
              label={item.label}
              value={
                values[
                  item.key
                ]
              }
              note={item.note}
            />
          ),
        )}
      </div>
    </article>
  );
}

const COMMERCIAL: Array<{
  key: MetricKey;
  label: string;
  note: string;
}> = [
  {
    key: "active_sales_without_items",
    label:
      "Vendas ativas sem itens",
    note:
      "Venda operacional precisa ter ao menos um produto.",
  },
  {
    key: "confirmed_quotes_without_sale",
    label:
      "Orçamentos confirmados sem venda",
    note:
      "Confirmação deve sempre apontar para a venda criada.",
  },
  {
    key: "quoted_quotes_with_sale",
    label:
      "Orçamentos em cotação já ligados a venda",
    note:
      "Evita estado parcial entre cotação e venda.",
  },
  {
    key: "cancelled_sales_active_reservations",
    label:
      "Vendas canceladas com reserva ativa",
    note:
      "Cancelamento deve liberar a reserva.",
  },
  {
    key: "delivered_without_stock_deducted",
    label:
      "Entregues sem baixa de estoque",
    note:
      "Entrega confirmada deve refletir o estoque físico.",
  },
  {
    key: "finalized_not_paid_or_delivered",
    label:
      "Finalizadas sem pagamento ou entrega",
    note:
      "Status final exige pagamento recebido e entrega concluída.",
  },
];

const VALUES: Array<{
  key: MetricKey;
  label: string;
  note: string;
}> = [
  {
    key: "sales_total_mismatch",
    label:
      "Divergências no total de vendas",
    note:
      "Itens menos desconto deve bater com total_amount.",
  },
  {
    key: "sales_cost_mismatch",
    label:
      "Divergências no custo de vendas",
    note:
      "Custo dos itens e brindes deve bater com total_cost.",
  },
  {
    key: "sales_profit_mismatch",
    label:
      "Divergências no lucro",
    note:
      "Lucro precisa ser total menos custo.",
  },
  {
    key: "confirmed_quote_total_mismatch",
    label:
      "Orçamento e venda com totais diferentes",
    note:
      "A conversão deve preservar o valor comercial.",
  },
  {
    key: "recent_received_without_payment_entry",
    label:
      "Recebimentos novos sem lançamento",
    note:
      "Após o controle financeiro novo, todo recebimento deve ter entrada.",
  },
];

const STOCK: Array<{
  key: MetricKey;
  label: string;
  note: string;
}> = [
  {
    key: "negative_stock_balances",
    label:
      "Estoque Suplementos negativo",
    note:
      "Saldos físicos não podem ficar abaixo de zero.",
  },
  {
    key: "negative_flavor_stock",
    label:
      "Estoque por sabor negativo",
    note:
      "Controle de sabores também precisa permanecer não negativo.",
  },
  {
    key: "reserved_gt_physical",
    label:
      "Reservado maior que físico",
    note:
      "Reserva não pode ultrapassar o estoque físico.",
  },
  {
    key: "fitness_negative_stock",
    label:
      "Estoque Fitness negativo",
    note:
      "Variantes Fitness não podem ficar abaixo de zero.",
  },
];

const OPERATIONS: Array<{
  key: MetricKey;
  label: string;
  note: string;
}> = [
  {
    key: "calendar_errors",
    label:
      "Erros no Google Calendar",
    note:
      "Fila de sincronização com status de erro.",
  },
  {
    key: "calendar_stuck",
    label:
      "Sincronizações travadas",
    note:
      "Itens pendentes/processando há mais de uma hora.",
  },
  {
    key: "partner_sales_with_inactive_partner",
    label:
      "Vendas ligadas a parceiro inativo",
    note:
      "Evita contabilização de parceria inválida.",
  },
  {
    key: "post_sale_planned_without_sale",
    label:
      "Pós-vendas sem venda vinculada",
    note:
      "Lembrete planejado precisa ter origem comercial.",
  },
  {
    key: "post_sale_completed_sales_open",
    label:
      "Pós-venda concluído ainda aberto",
    note:
      "Venda concluída não deve manter lote planejado.",
  },
];

export default async function CommercialIntegrityPage() {
  const [
    access,
    snapshot,
  ] = await Promise.all([
    getCurrentUserAccess(),
    getCommercialIntegritySnapshot(),
  ]);

  if (
    !access.canManageUsers
  ) {
    redirect(
      "/dashboard",
    );
  }

  const healthy =
    snapshot.status ===
    "healthy";

  return (
    <>
      <PageHeader
        eyebrow="Sala do Dono · Homologação"
        title="Integridade comercial"
        description="Auditoria automática e somente leitura dos vínculos entre orçamento, venda, estoque, pagamento, parceria, pós-venda e Google Calendar."
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

            <Link
              className="button ghost"
              href="/central/executivo/escala"
            >
              <Activity
                size={16}
              />
              Saúde de escala
            </Link>
          </div>
        }
      />

      <section className="stats-grid">
        <StatCard
          label="Saúde comercial"
          value={
            healthy
              ? "Saudável"
              : snapshot.status ===
                  "attention"
                ? "Atenção"
                : "Crítica"
          }
          note="Resultado consolidado da auditoria"
          icon={
            healthy
              ? CheckCircle2
              : TriangleAlert
          }
        />

        <StatCard
          label="Inconsistências críticas"
          value={String(
            snapshot.critical_count,
          )}
          note="Devem permanecer em zero"
          icon={ShieldCheck}
        />

        <StatCard
          label="Sincronizações em andamento"
          value={String(
            snapshot.attention_count,
          )}
          note="Pendentes ou processando no Calendar"
          icon={CalendarCheck}
        />

        <StatCard
          label="Histórico financeiro legado"
          value={String(
            snapshot.metrics
              .legacy_received_without_payment_entry,
          )}
          note="Anterior ao controle por lançamentos; informativo"
          icon={ReceiptText}
        />
      </section>

      <section className="executive-section-grid">
        <MetricGroup
          title="Fluxo comercial"
          description="Estados de orçamento, venda, entrega, cancelamento e reservas."
          metrics={COMMERCIAL}
          values={
            snapshot.metrics
          }
        />

        <MetricGroup
          title="Valores e pagamentos"
          description="Consistência entre itens, descontos, custos, lucro e recebimentos."
          metrics={VALUES}
          values={
            snapshot.metrics
          }
        />
      </section>

      <section className="executive-section-grid">
        <MetricGroup
          title="Estoque"
          description="Proteções contra saldos negativos e reservas impossíveis."
          metrics={STOCK}
          values={
            snapshot.metrics
          }
        />

        <MetricGroup
          title="Integrações e pós-venda"
          description="Calendar, parceiros e cadeia de pós-venda."
          metrics={OPERATIONS}
          values={
            snapshot.metrics
          }
        />
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Leitura complementar
            </h2>
            <p>
              Itens informativos que não entram como falha crítica.
            </p>
          </div>
          <CircleDollarSign
            size={19}
          />
        </div>

        <div className="panel-body sale-detail-list">
          <div className="sale-detail-line">
            <span>
              Calendar pendente
              <small>
                Processamento assíncrono normal quando temporário.
              </small>
            </span>
            <strong>
              {
                snapshot.metrics
                  .calendar_pending
              }
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>
              Calendar processando
              <small>
                Só vira alerta se ficar travado por mais de uma hora.
              </small>
            </span>
            <strong>
              {
                snapshot.metrics
                  .calendar_processing
              }
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>
              Corte do controle por lançamento
              <small>
                Recebimentos anteriores são tratados como histórico legado.
              </small>
            </span>
            <strong>
              {
                snapshot.payment_entry_cutover
              }
            </strong>
          </div>

          <div className="sale-detail-line">
            <span>
              Última auditoria
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
