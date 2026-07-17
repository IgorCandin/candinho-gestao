import { redirect } from "next/navigation";
import { Bot, CheckCircle2, CircleOff, KeyRound, Link2, MessageCircle, ShieldCheck, Sparkles, TriangleAlert, Webhook } from "lucide-react";
import { CopyTextButton } from "@/components/copy-text-button";
import { PageHeader } from "@/components/page-header";
import { getCentralIntegrationHealth, getCentralIntegrationReadiness } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

const labels: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook" };

function statusMeta(item: { status: string; health_status?: string | null }) {
  const health = item.health_status ?? item.status;
  if (health === "healthy" || item.status === "connected") return { label: "Conectada", cls: "green", icon: CheckCircle2 };
  if (health === "error" || item.status === "error") return { label: "Com erro", cls: "red", icon: TriangleAlert };
  if (health === "stale") return { label: "Sem atividade", cls: "orange", icon: TriangleAlert };
  return { label: "Desconectada", cls: "gray", icon: CircleOff };
}

function ReadyBadge({ ready, readyLabel = "Pronto", pendingLabel = "Pendente" }: { ready: boolean; readyLabel?: string; pendingLabel?: string }) {
  return <span className={`badge ${ready ? "green" : "orange"}`}>{ready ? <CheckCircle2 size={13}/> : <TriangleAlert size={13}/>} {ready ? readyLabel : pendingLabel}</span>;
}

export default async function IntegrationsPage() {
  const access = await getCurrentUserAccess();
  if (!access.canManageUsers && access.role !== "admin") redirect("/central");
  const [integrations, readiness] = await Promise.all([getCentralIntegrationHealth(), getCentralIntegrationReadiness()]);
  const metaReady = Boolean(readiness?.meta.ready);
  const openAiReady = Boolean(readiness?.openai.ready);
  const webhookUrl = readiness?.meta.webhook_url ?? "https://ilboydbakpcfoaexpnhw.supabase.co/functions/v1/central-meta-webhook";

  return <>
    <PageHeader eyebrow="Candinho Central" title="Integrações" description="Centralize WhatsApp, Instagram, Facebook e recursos de IA. A estrutura já está publicada; esta tela mostra exatamente o que falta para ativar cada conexão." />

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

    <article className="panel central-integration-security"><div className="panel-body"><Link2 size={22}/><div><strong>Como ativar de verdade</strong><p>1. Cadastre os segredos pendentes nas variáveis seguras das Edge Functions. 2. Configure o callback acima no aplicativo da Meta e conecte as contas desejadas. 3. Assim que os primeiros eventos chegarem, WhatsApp, Instagram e Facebook passam a aparecer automaticamente na saúde dos canais e no Inbox. Tokens e segredos nunca são exibidos nem gravados na tabela de integrações.</p></div></div></article>

    <div className="section-heading integration-channel-heading"><span>Canais conectados</span><h2>Saúde das contas</h2><p>Depois da configuração externa, cada conta aparece aqui com sincronização, erros e eventos processados.</p></div>
    <section className="central-health-grid">
      {integrations.length === 0 ? ["whatsapp", "instagram", "facebook"].map((provider) => <article className="central-health-card" key={provider}><span className="central-health-icon"><MessageCircle size={22}/></span><div><small>Canal</small><strong>{labels[provider]}</strong><em>{metaReady ? "Backend pronto; aguardando conexão da conta na Meta." : "Aguardando credenciais da Meta."}</em></div><span className="badge gray">Desconectada</span></article>) : integrations.map((item) => {
        const meta = statusMeta(item); const Icon = meta.icon;
        return <article className="central-health-card" key={`${item.provider}-${item.operation_scope}`}>
          <span className="central-health-icon"><MessageCircle size={22}/></span>
          <div><small>{item.operation_scope}</small><strong>{labels[item.provider] ?? item.provider}</strong><em>{item.account_name ?? "Conta sem nome"}</em><p>Última sincronização: {formatDateTime(item.last_sync_at)}</p>{item.last_error && <p className="health-error">{item.last_error}</p>}</div>
          <span className={`badge ${meta.cls}`}><Icon size={13}/>{meta.label}</span>
          <div className="central-health-events"><span>Processados <b>{Number(item.processed_events ?? 0)}</b></span><span>Pendentes <b>{Number(item.pending_events ?? 0)}</b></span><span>Falhos <b>{Number(item.failed_events ?? 0)}</b></span></div>
        </article>;
      })}
    </section>
  </>;
}
