import Link from "next/link";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  MousePointerClick,
  Route,
  Sparkles,
} from "lucide-react";
import type { NexusDailySnapshot } from "@/lib/nexus-daily-types";
import {
  nexusRouteHref,
  nexusRouteLabel,
  nexusWorkflowLabel,
} from "@/lib/nexus-route-labels";

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function NexusHabitsPanel({
  snapshot,
}: {
  snapshot: NexusDailySnapshot;
}) {
  return (
    <section className="nexus-habits-v453">
      <div className="nexus-habits-stats-v453">
        <article>
          <MousePointerClick size={17} />
          <span>Eventos técnicos</span>
          <strong>{snapshot.stats.events_30d}</strong>
          <small>últimos 30 dias</small>
        </article>
        <article>
          <Activity size={17} />
          <span>Dias aprendendo</span>
          <strong>{snapshot.stats.active_days_30d}</strong>
          <small>dias com uso real</small>
        </article>
        <article>
          <Route size={17} />
          <span>Rotas conhecidas</span>
          <strong>{snapshot.stats.learned_routes}</strong>
          <small>páginas usadas</small>
        </article>
        <article>
          <Sparkles size={17} />
          <span>Fluxos repetidos</span>
          <strong>{snapshot.stats.repeated_workflows}</strong>
          <small>sequências detectadas</small>
        </article>
      </div>

      <div className="nexus-habits-grid-v453">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2><Route size={18} /> Seus caminhos mais usados</h2>
              <p>O Nexus usa frequência e recorrência para organizar atalhos.</p>
            </div>
          </div>

          <div className="panel-body nexus-usage-list-v453">
            {snapshot.usage.map((item, index) => {
              const href = nexusRouteHref(item.route);
              const content = (
                <>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{nexusRouteLabel(item.route)}</strong>
                    <small>
                      {item.visits_7d}× em 7d · {item.visits_30d}× em 30d ·{" "}
                      {item.distinct_days} dia(s)
                    </small>
                  </div>
                  <b>
                    {item.avg_duration_seconds > 0
                      ? `${Math.round(item.avg_duration_seconds)}s`
                      : "—"}
                  </b>
                </>
              );

              return href ? (
                <Link href={href} key={item.route}>{content}</Link>
              ) : (
                <div key={item.route}>{content}</div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2><Sparkles size={18} /> Fluxos que você repete</h2>
              <p>Sequências de 3 telas feitas mais de uma vez.</p>
            </div>
          </div>

          <div className="panel-body nexus-workflow-list-v453">
            {snapshot.workflows.length ? (
              snapshot.workflows.map((workflow) => {
                const href = nexusRouteHref(workflow.step3);

                return (
                  <article key={`${workflow.step1}-${workflow.step2}-${workflow.step3}`}>
                    <strong>
                      {nexusWorkflowLabel([
                        workflow.step1,
                        workflow.step2,
                        workflow.step3,
                      ])}
                    </strong>
                    <span>
                      {workflow.repetitions} repetições · {workflow.distinct_days} dia(s)
                    </span>
                    {href && <Link href={href}>Ir para o último passo</Link>}
                  </article>
                );
              })
            ) : (
              <div className="empty compact">
                <Bot size={24} />
                <strong>Ainda aprendendo sequências</strong>
                Quando um fluxo se repetir, ele aparece aqui.
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2><CheckCircle2 size={18} /> Ações executadas pelo Nexus</h2>
            <p>
              Só aparecem ações que passaram pelo preview e pela sua confirmação.
            </p>
          </div>
        </div>

        <div className="nexus-action-history-v453">
          {snapshot.action_history.length ? (
            snapshot.action_history.map((item) => (
              <div key={item.id}>
                <span className={`badge ${item.status === "executed" ? "green" : "gray"}`}>
                  {item.status}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.source_route
                      ? `${nexusRouteLabel(item.source_route)} · `
                      : ""}
                    {dateTime(item.executed_at ?? item.created_at)}
                  </small>
                </div>
                <Clock3 size={14} />
              </div>
            ))
          ) : (
            <div className="empty compact">
              <CheckCircle2 size={24} />
              <strong>Nenhuma ação executada ainda</strong>
              Os primeiros previews confirmados vão formar esta trilha.
            </div>
          )}
        </div>
      </article>

      <div className="nexus-privacy-note-v453">
        <Bot size={15} />
        <span>
          <strong>O que o Nexus aprende:</strong> páginas, transições, cliques
          explicitamente marcados e duração da tela. <strong>O que ele não
          grava:</strong> texto digitado, senha, mensagem de cliente ou conteúdo
          de formulário.
        </span>
      </div>
    </section>
  );
}
