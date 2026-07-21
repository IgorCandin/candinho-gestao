import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  PackageSearch,
  PackageX,
  ShoppingCart,
} from "lucide-react";
import { DemandGapForm } from "@/components/demand-gap-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateOnly } from "@/lib/format";
import { getDemandGapCenter } from "@/lib/demand-gap-data";
import { updateDemandGapStatus } from "./actions";

const statusLabels: Record<string, string> = {
  open: "Aberta",
  evaluating: "Analisando",
  planned_purchase: "Planejada",
  ordered: "Pedido feito",
  stocked: "Resolvida",
  dismissed: "Descartada",
};

const priorityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  extreme: "Extrema",
};

export default async function DemandGapsPage() {
  const access = await getCurrentUserAccess();

  const canManage =
    access.role === "admin" ||
    access.canWriteSupplements ||
    access.canWriteFitness;

  if (!canManage) redirect("/central");

  const { summary, recent } =
    await getDemandGapCenter();

  const active = recent.filter(
    (item) =>
      !["stocked", "dismissed"].includes(
        item.status,
      ),
  ).length;

  const highPriority = recent.filter(
    (item) =>
      ["high", "extreme"].includes(
        item.priority,
      ) &&
      !["stocked", "dismissed"].includes(
        item.status,
      ),
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Rupturas e demanda perdida"
        description="Registre o que clientes procuram e você não tem. A Central acumula os sinais para transformar procura perdida em decisão de compra e mix."
      />

      <section className="stats-grid demand-gap-stats">
        <StatCard
          href="/central/rupturas"
          label="Demandas abertas"
          value={String(active)}
          note="Ainda exigem decisão"
          icon={PackageX}
        />

        <StatCard
          href="/central/rupturas"
          label="Produtos procurados"
          value={String(summary.length)}
          note="Itens únicos registrados"
          icon={PackageSearch}
        />

        <StatCard
          href="/central/rupturas"
          label="Alta prioridade"
          value={String(highPriority)}
          note="Alta ou extrema em aberto"
          icon={ShoppingCart}
        />

        <StatCard
          href="/central/rupturas"
          label="Sinais registrados"
          value={String(recent.length)}
          note="Últimos registros carregados"
          icon={BarChart3}
        />
      </section>

      <article className="panel demand-gap-create-panel">
        <div className="panel-head">
          <div>
            <h2>Registrar procura não atendida</h2>
            <p>
              Digite o produto e use o Nexus para pesquisar até 3 imagens na web antes de salvar.
            </p>
          </div>
          <PackageX size={20} />
        </div>

        <DemandGapForm />
      </article>

      <article className="panel demand-gap-ranking-panel">
        <div className="panel-head">
          <div>
            <h2>Produtos mais procurados</h2>
            <p>
              Quanto mais vezes um produto aparece aqui, maior a evidência para estudar compra ou inclusão no mix.
            </p>
          </div>
          <BarChart3 size={20} />
        </div>

        {summary.length === 0 ? (
          <div className="empty">
            <Boxes size={24} />
            <strong>
              Nenhuma ruptura registrada ainda
            </strong>
          </div>
        ) : (
          <div className="demand-gap-ranking-grid">
            {summary
              .slice(0, 18)
              .map((item) => (
                <article
                  className="demand-gap-ranking-card"
                  key={item.normalized_name}
                >
                  <div className="demand-gap-ranking-image">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <PackageSearch size={28} />
                    )}
                  </div>

                  <div>
                    <span>
                      {item.operation_scope ===
                      "fitness"
                        ? "Fitness"
                        : item.operation_scope ===
                            "both"
                          ? "Ambas"
                          : "Suplementos"}
                    </span>

                    <strong>
                      {item.product_name}
                    </strong>

                    <small>
                      {item.requests_count} procura(s)
                      {" · "}
                      {item.active_requests_count} ativa(s)
                    </small>

                    <em>
                      Última procura:{" "}
                      {formatDateOnly(
                        item.last_requested_on,
                      )}
                    </em>
                  </div>
                </article>
              ))}
          </div>
        )}
      </article>

      <article className="panel demand-gap-recent-panel">
        <div className="panel-head">
          <div>
            <h2>Registros recentes</h2>
            <p>
              Acompanhe até virar compra, estoque ou decisão de não trabalhar com o item.
            </p>
          </div>
          <PackageX size={20} />
        </div>

        <div className="demand-gap-recent-list">
          {recent.map((item) => (
            <article
              className="demand-gap-recent-row"
              key={item.id}
            >
              <div>
                <strong>
                  {item.product_name}
                </strong>

                <span>
                  {item.customer_name ??
                    "Cliente não informado"}
                  {item.city
                    ? ` · ${item.city}`
                    : ""}
                  {" · "}
                  {formatDateOnly(
                    item.requested_on,
                  )}
                </span>
              </div>

              <div className="demand-gap-badges">
                <span className={`badge demand-priority-${item.priority}`}>
                  {priorityLabels[item.priority]}
                </span>

                <span className="badge blue">
                  {statusLabels[item.status]}
                </span>
              </div>

              <div className="demand-gap-status-actions">
                {item.status !==
                  "planned_purchase" && (
                  <form
                    action={
                      updateDemandGapStatus
                    }
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={item.id}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value="planned_purchase"
                    />
                    <button
                      className="button ghost compact-button"
                      type="submit"
                    >
                      Planejar compra
                    </button>
                  </form>
                )}

                {item.status !== "ordered" && (
                  <form
                    action={
                      updateDemandGapStatus
                    }
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={item.id}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value="ordered"
                    />
                    <button
                      className="button ghost compact-button"
                      type="submit"
                    >
                      Pedido feito
                    </button>
                  </form>
                )}

                {item.status !== "stocked" && (
                  <form
                    action={
                      updateDemandGapStatus
                    }
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={item.id}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value="stocked"
                    />
                    <button
                      className="button gold compact-button"
                      type="submit"
                    >
                      Resolvida
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      </article>
    </>
  );
}
