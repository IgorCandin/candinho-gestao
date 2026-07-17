import { redirect } from "next/navigation";
import { Bot, CheckCircle2, CircleOff, KeyRound, Link2, MessageCircle, Plus, Save, ShieldCheck, Sparkles, TriangleAlert, Webhook } from "lucide-react";
import { CopyTextButton } from "@/components/copy-text-button";
import { PageHeader } from "@/components/page-header";
import { getCentralIntegrationHealth, getCentralIntegrationReadiness } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { registerCentralIntegration } from "./actions";

const labels: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };
const scopeLabels: Record<string, string> = { company: "Candinho Company", supplements: "Suplementos", fitness: "Fitness" };

function statusMeta(item: { status: string; health_status?: string | null }) {
  const health = item.health_status ?? item.status;
  if (health === "healthy" || item.status === "connected") return { label: "Conectada", cls: "green", icon: CheckCircle2 };
  if (health === "error" || item.status === "error") return { label: "Com erro", cls: "red", icon: TriangleAlert };
  if (health === "stale" || health === "idle") return { label: "Sem atividade", cls: "orange", icon: TriangleAlert };
  return { label: "Desconectada", cls: "gray", icon: CircleOff };
}

function ReadyBadge({ ready, readyLabel = "Pronto", pendingLabel = "Pendente" }: { ready: boolean; readyLabel?: string; pendingLabel?: string }) {
  return <span className={`badge ${ready ? "green" : "orange"}`}>{ready ? <CheckCircle2 size={13}/> : <TriangleAlert size={13}/>} {ready ? readyLabel : pendingLabel}</span>;
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function IntegrationsPage({ searchParams }: Props) {
  const access = await getCurrentUserAccess();
  if (!access.canManageUsers && access.role !== "admin") redirect("/central");
  const params = await searchParams;
  const savedProvider = typeof params.salvo === "string" ? params.salvo : null;
  const [integrations, readiness] = await Promise.all([getCentralIntegrationHealth(), getCentralIntegrationReadiness()]);
  const metaReady = Boolean(readiness?.meta.ready);
  const openAiReady = Boolean(readiness?.openai.ready);
  const webhookUrl = readiness?.meta.webhook_url ?? "https://ilboydbakpcfoaexpnhw.supabase.co/functions/v1/central-meta-webhook";

  return <>
    <PageHeader eyebrow="Candinho Central" title="Integrações" description="Cadastre as contas, acompanhe a prontidão das credenciais e conecte WhatsApp, Instagram, Facebook e recursos de IA sem armazenar segredos no banco." />

    {savedProvider && <div className="integration-success-banner"><CheckCircle2 size={18}/><span><strong>{labels[savedProvider] ?? "Conta"} cadastrada.</strong><small>O vínculo foi salvo sem tokens ou senhas. A conta ficará desconectada até a configuração externa da Meta estar concluída.</small></span></div>}

    <section className="integration-readiness-grid">
      <article className="panel integration-readiness-card">
        <div className="panel-head"><div><h2>Meta · Mensagens</h2><p>Backend para WhatsApp, Instagram e Facebook.</p></div><ReadyBadge ready={metaReady} readyLabel="Pronto para conectar" pendingLabel="Faltam credenciais"/></div>
        <div className="panel-body integration-check-list">
          <div><Webhook size={18}/><span><strong>Webhook publicado</strong><small>Recepção centralizada de eventos da Meta.</small></span><span className="badge green">Ativo</span></div>
          <div><KeyRound size={18}/><span><strong>META_WEBHOOK_VERIFY_TOKEN</strong><small>Token usado na validação inicial do webhook.</small></span><ReadyBadge ready={Boolean(readiness?.meta.verify_token_configured)} readyLabel="Configurado"/></div>
          <div><ShieldCheck size={18}/><span><strong>META_APP_SECRET</strong><small>Usado para validar a assinatura dos eventos recebidos.</small></span><ReadyBadge ready={Boolean(readiness?.meta.app_secret_configured)} readyLabel="Configurado"/></div>
          <div className="integration-webhook-row"><Link2 size={18}/><span><strong>URL de callback</strong><code>{webhookUrl}</code></span><CopyTextButton value={webhookUrl} label="Copiar URL"/></div>
        </div>
      </article>

      <article className="panel integration-readiness-card">
        <div className="panel-head"><div><h2>OpenAI · Nexus e Mídia</h2><p>IA para sugestões de atendimento e classificação de imagens.</p></div><ReadyBadge ready={openAiReady} readyLabel="IA disponível" pendingLabel="Falta API key"/></div>
        <div className="panel-body integration-check-list">
          <div><Bot size={18}/><span><strong>Nexus IA</strong><small>Função publicada e protegida por autenticação.</small></span><span className="badge green">Ativa</span></div>
          <div><Sparkles size={18}/><span><strong>Classificação de mídia</strong><small>Organiza fotos por descrição, categoria e tags.</small></span><span className="badge green">Ativa</span></div>
          <div><KeyRound size={18}/><span><strong>OPENAI_API_KEY</strong><small>Necessária para executar Nexus e classificação por IA.</small></span><ReadyBadge ready={Boolean(readiness?.openai.api_key_configured)} readyLabel="Configurada"/></div>
          <div><ShieldCheck size={18}/><span><strong>Modelos configurados</strong><small>Nexus: {readiness?.openai.nexus_model ?? "gpt-5-mini"} · Mídia: {readiness?.openai.media_model ?? "gpt-5-mini"}</small></span></div>
        </div>
      </article>
    </section>

    <article className="panel integration-account-setup">
      <div className="panel-head"><div><h2>Cadastrar conta Meta</h2><p>Salve somente os identificadores públicos/operacionais. Tokens, chaves e segredos continuam nos Secrets das Edge Functions.</p></div><Plus size={20}/></div>
      <form action={registerCentralIntegration} className="panel-body integration-account-form">
        <label className="field"><span>Canal</span><select className="input" name="provider" required defaultValue="whatsapp"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select></label>
        <label className="field"><span>Operação</span><select className="input" name="operation_scope" required defaultValue="company"><option value="company">Candinho Company</option><option value="supplements">Candinho Suplementos</option><option value="fitness">Candinho Fitness</option></select></label>
        <label className="field"><span>Nome da conta</span><input className="input" name="account_name" placeholder="Ex.: Candinho Suplementos" maxLength={180}/></label>
        <label className="field integration-account-id"><span>ID externo da conta</span><input className="input" name="account_external_id" placeholder="Cole o identificador fornecido pela plataforma Meta" maxLength={180} required/><small>Use o identificador técnico da conta/canal. Não cole access token, app secret ou senha.</small></label>
        <div className="integration-account-actions"><button className="button gold" type="submit"><Save size={16}/>Salvar conta</button></div>
      </form>
    </article>

    <article className="panel central-integration-security"><div className="panel-body"><Link2 size={22}/><div><strong>Ordem para ativar de verdade</strong><p>1. Cadastre acima os IDs das contas que farão parte da Central. 2. Configure os segredos pendentes nas Edge Functions. 3. Configure o callback no aplicativo da Meta. 4. Associe os eventos/mensagens às contas cadastradas. 5. Assim que os primeiros eventos chegarem, a saúde do canal e o Inbox passam a refletir a integração real. Tokens e segredos nunca são gravados em central_integrations.settings.</p></div></div></article>

    <div className="section-heading integration-channel-heading"><span>Canais cadastrados</span><h2>Saúde das contas</h2><p>Contas cadastradas aparecem aqui mesmo antes da conexão. Depois da ativação externa, você acompanha sincronização, erros e eventos processados.</p></div>
    <section className="central-health-grid">
      {integrations.length === 0 ? ["whatsapp", "instagram", "facebook"].map((provider) => <article className="central-health-card" key={provider}><span className="central-health-icon"><MessageCircle size={22}/></span><div><small>Canal</small><strong>{labels[provider]}</strong><em>{metaReady ? "Backend pronto; cadastre uma conta para iniciar a ativação." : "Aguardando credenciais da Meta."}</em></div><span className="badge gray">Não cadastrada</span></article>) : integrations.map((item) => {
        const meta = statusMeta(item); const Icon = meta.icon;
        return <article className="central-health-card" key={`${item.provider}-${item.operation_scope}-${item.account_external_id ?? item.account_name ?? "account"}`}>
          <span className="central-health-icon"><MessageCircle size={22}/></span>
          <div><small>{scopeLabels[item.operation_scope] ?? item.operation_scope}</small><strong>{labels[item.provider] ?? item.provider}</strong><em>{item.account_name ?? "Conta sem nome"}</em>{item.account_external_id && <code className="central-health-account-id">ID: {item.account_external_id}</code>}<p>Última sincronização: {formatDateTime(item.last_sync_at)}</p>{item.last_error && <p className="health-error">{item.last_error}</p>}</div>
          <span className={`badge ${meta.cls}`}><Icon size={13}/>{meta.label}</span>
          <div className="central-health-events"><span>Processados <b>{Number(item.processed_events ?? 0)}</b></span><span>Pendentes <b>{Number(item.pending_events ?? 0)}</b></span><span>Falhos <b>{Number(item.failed_events ?? 0)}</b></span></div>
        </article>;
      })}
    </section>
  </>;
}
