import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  KeyRound,
  Link2,
  ScrollText,
  ShieldCheck,
  ToggleLeft,
  TriangleAlert,
  UserCog,
  UsersRound,
} from "lucide-react";
import {
  CommercialPagination,
} from "@/components/commercial-pagination";
import {
  FeatureFlagManager,
} from "@/components/feature-flag-manager";
import {
  PageHeader,
} from "@/components/page-header";
import {
  StatCard,
} from "@/components/stat-card";
import {
  getCentralGovernanceSnapshotV2,
} from "@/lib/central-data";
import {
  getCurrentUserAccess,
} from "@/lib/data";
import {
  formatDateTime,
} from "@/lib/format";
import {
  getCentralGovernanceAuditPage,
} from "@/lib/governance-scale-data";

const entityLabel:
  Record<string,string> = {
    partner_user_link:
      "Acesso de parceiro",
    central_integration:
      "Integração",
    ui_feature_flag:
      "Recurso do sistema",
    partner_portal_invite:
      "Convite de parceiro",
    inventory_reconciliation:
      "Reconciliação de estoque",
  };

const healthLabel:
  Record<string,string> = {
    healthy:
      "Saudável",
    stale:
      "Sem sincronizar",
    never_synced:
      "Nunca sincronizou",
    disconnected:
      "Desconectada",
    error:
      "Com erro",
  };

export default async function CentralGovernancePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
  }>;
}) {
  const access =
    await getCurrentUserAccess();

  if (
    !(
      access.role === "admin"
      || access.canManageUsers
    )
  ) {
    redirect(
      "/central",
    );
  }

  const params =
    await searchParams;

  const page =
    Number(
      params.page ?? 1,
    );

  const [
    data,
    auditPage,
  ] = await Promise.all([
    getCentralGovernanceSnapshotV2(
      1,
    ),
    getCentralGovernanceAuditPage(
      page,
      30,
    ),
  ]);

  const unhealthy =
    data.integrations.filter(
      (item) =>
        item.health_status
        && item.health_status
          !== "healthy",
    ).length;

  const failures =
    data.integrations.reduce(
      (sum,item) =>
        sum
        + Number(
            item.failed_events
            ?? 0,
          ),
      0,
    );

  return (
    <>
      <PageHeader
        eyebrow="Candinho Central"
        title="Governança V2"
        description="Controle de acessos, recursos do sistema, integrações e histórico de alterações críticas da Candinho Company."
        action={
          <Link
            className="button ghost"
            href="/configuracoes"
          >
            <UserCog
              size={15}
            />
            Perfis e permissões
          </Link>
        }
      />

      <section className="stats-grid central-governance-stats">
        <StatCard
          href="/configuracoes"
          label="Usuários ativos"
          value={String(
            data.users.active,
          )}
          note={`${data.users.admins} admin · ${data.users.operators} operação · ${data.users.sales} vendas`}
          icon={UsersRound}
        />

        <StatCard
          href="/parceiros/gerencial"
          label="Portais parceiros"
          value={String(
            data.partner_portal
              .active_portals,
          )}
          note={`${data.partner_portal.without_portal} parceiro(s) ainda sem portal`}
          icon={KeyRound}
        />

        <StatCard
          href="/central/integracoes"
          label="Integrações"
          value={String(
            data.integrations.length,
          )}
          note={`${unhealthy} exigindo atenção`}
          icon={Link2}
        />

        <StatCard
          label="Falhas de webhook"
          value={String(
            failures,
          )}
          note="Somatório das integrações cadastradas"
          icon={TriangleAlert}
        />

        <StatCard
          label="Recursos controlados"
          value={String(
            data.feature_flags.length,
          )}
          note={`${data.feature_flags.filter((flag)=>flag.enabled).length} ativos agora`}
          icon={ToggleLeft}
        />

        <StatCard
          label="Eventos auditados"
          value={String(
            auditPage.total,
          )}
          note="Histórico paginado de governança"
          icon={ScrollText}
        />
      </section>

      <article className="panel governance-flags-panel">
        <div className="panel-head">
          <div>
            <h2>
              Recursos da Company
            </h2>
            <p>
              Ative ou oculte módulos sem apagar dados. Mudanças ficam registradas no histórico de auditoria.
            </p>
          </div>
          <ToggleLeft
            size={20}
          />
        </div>

        <div className="panel-body">
          <FeatureFlagManager
            flags={
              data.feature_flags
            }
          />
        </div>
      </article>

      <article className="panel governance-health-panel">
        <div className="panel-head">
          <div>
            <h2>
              Saúde das integrações
            </h2>
            <p>
              Leitura rápida do que está conectado, parado ou com erro.
            </p>
          </div>
          <Activity
            size={20}
          />
        </div>

        <div className="panel-body governance-health-grid">
          {data.integrations.length===0
            ? (
              <div className="empty">
                <Link2
                  size={24}
                />
                <strong>
                  Nenhuma integração cadastrada
                </strong>
                Meta e OpenAI continuam aguardando as credenciais e contas externas.
              </div>
            )
            : data.integrations.map(
                (item) => (
                  <div
                    className={`governance-health-card ${item.health_status ?? item.status}`}
                    key={`${item.provider}-${item.operation_scope}-${item.account_external_id ?? ""}`}
                  >
                    <div>
                      <strong>
                        {item.account_name
                          ?? item.provider}
                      </strong>
                      <span>
                        {item.provider}
                        {" · "}
                        {item.operation_scope}
                      </span>
                    </div>

                    <b>
                      {
                        healthLabel[
                          item.health_status
                          ?? ""
                        ]
                        ?? item.health_status
                        ?? item.status
                      }
                    </b>

                    <small>
                      Processados:{" "}
                      {Number(
                        item.processed_events
                        ?? 0,
                      )}
                      {" · "}
                      Pendentes:{" "}
                      {Number(
                        item.pending_events
                        ?? 0,
                      )}
                      {" · "}
                      Falhas:{" "}
                      {Number(
                        item.failed_events
                        ?? 0,
                      )}
                    </small>
                  </div>
                ),
              )}
        </div>
      </article>

      <article className="panel governance-audit-panel">
        <div className="panel-head">
          <div>
            <h2>
              Histórico de governança
            </h2>
            <p>
              Alterações em acessos, integrações, recursos, convites e reconciliações. Exibido em páginas de 30 eventos.
            </p>
          </div>
          <ShieldCheck
            size={20}
          />
        </div>

        {auditPage.items.length===0
          ? (
            <div className="empty">
              <ScrollText
                size={24}
              />
              <strong>
                Nenhum evento novo
              </strong>
              O feed começa a registrar alterações feitas depois que os gatilhos de auditoria foram ativados.
            </div>
          )
          : (
            <div className="governance-audit-list">
              {auditPage.items.map(
                (event) => (
                  <div
                    className="governance-audit-row"
                    key={event.id}
                  >
                    <span className="governance-audit-icon">
                      <ShieldCheck
                        size={16}
                      />
                    </span>

                    <div>
                      <strong>
                        {
                          entityLabel[
                            event.entity_type
                          ]
                          ?? event.entity_type
                        }
                      </strong>
                      <span>
                        {event.action}
                      </span>
                      <small>
                        {event.created_by_name
                          ?? "Sistema"}
                        {" · "}
                        {formatDateTime(
                          event.created_at,
                        )}
                      </small>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

        <CommercialPagination
          pathname="/central/governanca"
          page={
            auditPage.page
          }
          totalPages={
            auditPage.totalPages
          }
          total={
            auditPage.total
          }
          pageSize={
            auditPage.pageSize
          }
        />
      </article>
    </>
  );
}
