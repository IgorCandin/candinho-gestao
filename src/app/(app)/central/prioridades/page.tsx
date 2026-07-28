import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Link2,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCentralDailyPriorities } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const scopeLabels: Record<
  string,
  string
> = {
  company: "Central",
  supplements: "Suplementos",
  fitness: "Fitness",
  marketing: "Marketing",
};

const INTERNAL_CATEGORIES =
  new Set([
    "task",
    "supplier",
    "other",
  ]);

export default async function CentralPrioritiesPage() {
  const access =
    await getCurrentUserAccess();

  if (
    !(
      access.role === "admin" ||
      access.canAccessSupplements ||
      access.canAccessFitness ||
      access.canAccessMarketing
    )
  ) {
    redirect("/dashboard");
  }

  const data =
    await getCentralDailyPriorities();

  const internalTasks =
    data.tasks.filter(
      (item) =>
        INTERNAL_CATEGORIES.has(
          item.category,
        ) &&
        (item.sort_rank === 0 ||
          item.priority ===
            "urgent" ||
          item.priority ===
            "attention"),
    );

  const internalTotal =
    internalTasks.length +
    data.inventory.length +
    (access.canManageUsers
      ? data.summary.partner_attention +
        data.summary
          .integration_attention
      : 0);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Prioridades operacionais"
        description="Só problemas internos, estoque e infraestrutura. Vendas, recompra, leads e CRM continuam dentro de cada operação."
      />

      <section className="stats-grid central-priority-stats">
        <StatCard
          href="/central/prioridades"
          label="Exigem ação"
          value={String(internalTotal)}
          note="somente operação interna"
          icon={ShieldAlert}
        />

        <StatCard
          href="/estoque/reconciliacao"
          label="Estoque"
          value={String(
            data.inventory.length,
          )}
          note="pontos ou produtos em atenção"
          icon={Boxes}
        />

        <StatCard
          href="/central/agenda"
          label="Tarefas internas"
          value={String(
            internalTasks.length,
          )}
          note="atrasadas, urgentes ou em atenção"
          icon={ClipboardList}
        />

        {access.canManageUsers && (
          <StatCard
            href="/parceiros/gerencial"
            label="Parceiros"
            value={String(
              data.summary
                .partner_attention,
            )}
            note="portais que exigem revisão"
            icon={UsersRound}
          />
        )}

        {access.canManageUsers && (
          <StatCard
            href="/central/governanca"
            label="Integrações"
            value={String(
              data.summary
                .integration_attention,
            )}
            note="canais fora do estado saudável"
            icon={Link2}
          />
        )}
      </section>

      {internalTotal === 0 ? (
        <article className="panel">
          <div className="empty">
            <CheckCircle2 size={26} />
            <strong>
              Nenhum problema operacional crítico
            </strong>
            A Central está limpa. As rotinas comerciais continuam nas operações.
          </div>
        </article>
      ) : (
        <section className="central-priority-grid">
          {access.canAccessSupplements && (
            <article className="panel priority-section-card">
              <div className="panel-head">
                <div>
                  <h2>
                    Estoque em atenção
                  </h2>
                  <p>
                    Conferências e problemas que exigem intervenção.
                  </p>
                </div>
                <Boxes size={20} />
              </div>

              <div className="priority-list">
                {data.inventory.length ===
                0 ? (
                  <div className="empty">
                    <Boxes size={22} />
                    <strong>
                      Estoque sem pendência crítica
                    </strong>
                  </div>
                ) : (
                  data.inventory.map(
                    (item) => (
                      <Link
                        className="priority-row"
                        href="/estoque/reconciliacao"
                        key={`${item.attention_type}-${item.entity_id}`}
                      >
                        <span>
                          <strong>
                            {item.title}
                          </strong>
                          <small>
                            {
                              item.attention_type
                            }
                          </small>
                        </span>
                        <b>
                          {item.status}
                        </b>
                      </Link>
                    ),
                  )
                )}
              </div>
            </article>
          )}

          <article className="panel priority-section-card">
            <div className="panel-head">
              <div>
                <h2>
                  Problemas internos
                </h2>
                <p>
                  Somente tarefas atrasadas, urgentes ou em atenção.
                </p>
              </div>
              <ClipboardList
                size={20}
              />
            </div>

            <div className="priority-list">
              {internalTasks.length ===
              0 ? (
                <div className="empty">
                  <CheckCircle2
                    size={22}
                  />
                  <strong>
                    Sem tarefa interna crítica
                  </strong>
                </div>
              ) : (
                internalTasks.map(
                  (item) => (
                    <Link
                      className="priority-row"
                      href="/central/agenda"
                      key={item.id}
                    >
                      <span>
                        <strong>
                          {item.title}
                        </strong>
                        <small>
                          {scopeLabels[
                            item
                              .operation_scope
                          ] ??
                            item.operation_scope}
                        </small>
                        <em>
                          {formatDateTime(
                            item.due_at,
                          )}
                        </em>
                      </span>

                      <b
                        className={
                          item.sort_rank ===
                          0
                            ? "priority-danger"
                            : ""
                        }
                      >
                        {item.sort_rank ===
                        0
                          ? "Atrasada"
                          : item.priority ===
                              "urgent"
                            ? "Urgente"
                            : "Atenção"}
                      </b>
                    </Link>
                  ),
                )
              )}
            </div>
          </article>

          {access.canManageUsers &&
            data.summary
              .partner_attention >
              0 && (
              <article className="panel priority-section-card">
                <div className="panel-head">
                  <div>
                    <h2>
                      Portal Parceiro
                    </h2>
                    <p>
                      Acessos ou vínculos que precisam de revisão.
                    </p>
                  </div>
                  <ShieldAlert
                    size={20}
                  />
                </div>

                <div className="panel-body">
                  <Link
                    className="central-priority-cta"
                    href="/parceiros/gerencial"
                  >
                    <UsersRound
                      size={18}
                    />
                    <span>
                      <strong>
                        {
                          data.summary
                            .partner_attention
                        }{" "}
                        parceiro(s) em atenção
                      </strong>
                      <small>
                        Abrir diagnóstico dos portais.
                      </small>
                    </span>
                  </Link>
                </div>
              </article>
            )}

          {access.canManageUsers &&
            data.summary
              .integration_attention >
              0 && (
              <article className="panel priority-section-card">
                <div className="panel-head">
                  <div>
                    <h2>
                      Integrações
                    </h2>
                    <p>
                      Canais com erro, desconectados ou aguardando configuração.
                    </p>
                  </div>
                  <BellRing size={20} />
                </div>

                <div className="panel-body">
                  <Link
                    className="central-priority-cta"
                    href="/central/governanca"
                  >
                    <Link2 size={18} />
                    <span>
                      <strong>
                        {
                          data.summary
                            .integration_attention
                        }{" "}
                        integração(ões) em atenção
                      </strong>
                      <small>
                        Abrir diagnóstico dos canais.
                      </small>
                    </span>
                  </Link>
                </div>
              </article>
            )}
        </section>
      )}
    </>
  );
}
