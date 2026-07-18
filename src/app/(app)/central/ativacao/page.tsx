import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, CheckCircle2, CircleDot, Inbox, KeyRound, Link2, MessageCircle, Rocket, ShieldCheck, Sparkles, TriangleAlert, UsersRound, Webhook } from "lucide-react";
import { CopyTextButton } from "@/components/copy-text-button";
import { PageHeader } from "@/components/page-header";
import { getAllCentralQuickReplies, getCentralDashboardSnapshot, getCentralDailyPriorities, getCentralIntegrationHealth, getCentralIntegrationReadiness, getPartnerPortalHealthSnapshot } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

function CheckItem({ ok, title, detail, href }: { ok: boolean; title: string; detail: string; href?: string }) {
  const content = <><span className={`launch-check-icon ${ok ? "ok" : "pending"}`}>{ok ? <CheckCircle2 size={18}/> : <TriangleAlert size={18}/>}</span><span><strong>{title}</strong><small>{detail}</small></span><b>{ok ? "Pronto" : "Pendente"}</b></>;
  return href ? <Link className="launch-check-row" href={href}>{content}</Link> : <div className="launch-check-row">{content}</div>;
}

export default async function CentralActivationPage() {
  const access = await getCurrentUserAccess();
  if (!access.canManageUsers && access.role !== "admin") redirect("/central");

  const [readiness, integrations, partners, priorities, quickReplies, dashboard] = await Promise.all([
    getCentralIntegrationReadiness(),
    getCentralIntegrationHealth(),
    getPartnerPortalHealthSnapshot(),
    getCentralDailyPriorities(),
    getAllCentralQuickReplies(),
    getCentralDashboardSnapshot(),
  ]);

  const metaReceive = Boolean(readiness?.meta.receive_ready ?? readiness?.meta.ready);
  const metaSend = Boolean(readiness?.meta.send_ready);
  const openAi = Boolean(readiness?.openai.ready);
  const hasAccounts = integrations.length > 0;
  const partnerReady = partners.summary.ready >= 2;
  const partnerFirstLogin = partners.items.filter((item) => item.health_status === "ready" && Boolean(item.last_sign_in_at)).length;
  const operationalReady = quickReplies.length > 0;
  const technicalReady = partnerReady && operationalReady;
  const externalReady = hasAccounts && metaReceive && metaSend && openAi;
  const webhookUrl = readiness?.meta.webhook_url ?? "https://ilboydbakpcfoaexpnhw.supabase.co/functions/v1/central-meta-webhook";

  const blockers = [
    !hasAccounts ? "Cadastrar os IDs técnicos das contas Meta." : null,
    !metaReceive ? "Configurar META_WEBHOOK_VERIFY_TOKEN e META_APP_SECRET nos Secrets." : null,
    !metaSend ? "Configurar META_GRAPH_API_VERSION e os tokens de envio dos canais." : null,
    !openAi ? "Configurar OPENAI_API_KEY para liberar Nexus e classificação de mídia." : null,
    partnerFirstLogin < Math.min(2, partners.summary.ready) ? "Fazer o primeiro login real de CTS e ItaPharma e trocar as senhas temporárias." : null,
  ].filter(Boolean) as string[];

  return <>
    <PageHeader eyebrow="Candinho Central" title="Central de Ativação" description="Último checklist técnico antes de conectar as contas reais da Meta e a OpenAI. Esta tela não armazena tokens, chaves ou senhas."/>

    <section className="launch-hero panel">
      <div className="panel-body">
        <span className={`launch-hero-icon ${externalReady ? "ok" : "pending"}`}><Rocket size={28}/></span>
        <div><small>STATUS DA V1</small><h2>{externalReady ? "Integrações prontas para teste ponta a ponta" : technicalReady ? "Base técnica pronta para integrar" : "Ainda há pendências técnicas internas"}</h2><p>{externalReady ? "As credenciais externas estão detectadas. O próximo passo é testar mensagens reais entrando e saindo." : "A estrutura interna está montada. Complete abaixo as credenciais externas e os primeiros logins para iniciar os testes reais."}</p></div>
        <span className={`badge ${externalReady ? "green" : technicalReady ? "orange" : "red"}`}>{externalReady ? "PRONTO PARA TESTAR" : technicalReady ? "PRONTO PARA INTEGRAR" : "REVISAR"}</span>
      </div>
    </section>

    <section className="launch-summary-grid">
      <article className="panel launch-summary-card"><UsersRound size={20}/><small>Portais parceiros</small><strong>{partners.summary.ready}/{partners.summary.total}</strong><span>{partnerFirstLogin} com login registrado</span></article>
      <article className="panel launch-summary-card"><Link2 size={20}/><small>Contas Meta</small><strong>{integrations.length}</strong><span>{hasAccounts ? "cadastradas" : "nenhuma cadastrada"}</span></article>
      <article className="panel launch-summary-card"><MessageCircle size={20}/><small>Inbox</small><strong>{dashboard.open_conversations}</strong><span>{dashboard.unread} não lida(s)</span></article>
      <article className="panel launch-summary-card"><CircleDot size={20}/><small>Fila do dia</small><strong>{priorities.summary.total}</strong><span>prioridade(s) operacional(is)</span></article>
      <article className="panel launch-summary-card"><Sparkles size={20}/><small>Respostas rápidas</small><strong>{quickReplies.length}</strong><span>modelo(s) cadastrado(s)</span></article>
    </section>

    <section className="launch-grid">
      <article className="panel">
        <div className="panel-head"><div><h2>1 · Base interna</h2><p>O que deve estar pronto antes de ligar serviços externos.</p></div><ShieldCheck size={20}/></div>
        <div className="launch-check-list">
          <CheckItem ok={partnerReady} title="Portal Parceiro" detail={`${partners.summary.ready} portal(is) com diagnóstico saudável. CTS e ItaPharma devem permanecer isolados das operações internas.`} href="/parceiros/gerencial"/>
          <CheckItem ok={operationalReady} title="Produtividade do Inbox" detail={`${quickReplies.length} resposta(s) rápida(s), atribuição de responsável e follow-up preparados.`} href="/central/respostas"/>
          <CheckItem ok={true} title="Prioridades e Radar" detail="Fila diária consolidada e Radar preparado para transformar oportunidade em retorno da Agenda." href="/central/prioridades"/>
          <CheckItem ok={true} title="Governança e reconciliação" detail="Auditoria, permissões, alertas e reconciliação de estoque disponíveis sem ajuste automático de saldo." href="/central/governanca"/>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>2 · Meta</h2><p>Receber e responder WhatsApp, Instagram e Facebook.</p></div><Webhook size={20}/></div>
        <div className="launch-check-list">
          <CheckItem ok={hasAccounts} title="Contas cadastradas" detail={hasAccounts ? `${integrations.length} conta(s) identificada(s) na Central.` : "Cadastre os IDs técnicos das contas; não use tokens neste formulário."} href="/central/integracoes"/>
          <CheckItem ok={metaReceive} title="Recebimento" detail="Verify Token + App Secret necessários para validar o webhook e receber eventos." href="/central/integracoes"/>
          <CheckItem ok={metaSend} title="Envio" detail="Graph API version + token do canal necessários para responder pelo Inbox." href="/central/integracoes"/>
          <div className="launch-webhook"><span><Webhook size={16}/><div><strong>Callback do webhook</strong><code>{webhookUrl}</code></div></span><CopyTextButton value={webhookUrl} label="Copiar URL"/></div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>3 · OpenAI</h2><p>Nexus e classificação inteligente da biblioteca de mídia.</p></div><Bot size={20}/></div>
        <div className="launch-check-list">
          <CheckItem ok={Boolean(readiness?.openai.api_key_configured)} title="OPENAI_API_KEY" detail="A chave deve ficar somente nos Secrets do servidor, nunca no navegador ou Git." href="/central/integracoes"/>
          <CheckItem ok={openAi} title="Nexus disponível" detail={`Modelo de atendimento: ${readiness?.openai.nexus_model ?? "gpt-5-mini"}. Modelo de mídia: ${readiness?.openai.media_model ?? "gpt-5-mini"}.`} href="/central/nexus"/>
          <CheckItem ok={openAi} title="Classificação de mídia" detail="Quando ativa, fotos podem receber descrição e tags para busca interna." href="/central/midia"/>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>4 · Teste final</h2><p>Roteiro que faremos assim que as credenciais forem conectadas.</p></div><Inbox size={20}/></div>
        <div className="launch-test-flow">
          <span>1<strong>Enviar mensagem real para o canal</strong><small>Confirmar entrada no Inbox e criação/vínculo do contato.</small></span>
          <span>2<strong>Gerar sugestão com Nexus</strong><small>Revisar contexto, segurança e texto sugerido.</small></span>
          <span>3<strong>Responder pelo Inbox</strong><small>Confirmar envio, ID externo e status de entrega.</small></span>
          <span>4<strong>Validar Portal Parceiro</strong><small>CTS e ItaPharma entram, veem apenas os próprios dados e trocam a senha.</small></span>
          <span>5<strong>Fechar V1</strong><small>Corrigir apenas os bugs revelados pelos testes reais e fazer o hardening final.</small></span>
        </div>
      </article>
    </section>

    {blockers.length > 0 && <article className="panel launch-blockers">
      <div className="panel-head"><div><h2>O que ainda impede o teste completo</h2><p>São passos externos ou de primeiro acesso; a estrutura técnica já está preparada.</p></div><KeyRound size={20}/></div>
      <div className="panel-body">{blockers.map((item) => <p key={item}><TriangleAlert size={15}/>{item}</p>)}</div>
    </article>}

    <article className="panel launch-next-step"><div className="panel-body"><Rocket size={22}/><div><strong>Depois deste V10, pare de criar funcionalidades novas antes de integrar.</strong><p>O próximo ciclo deve ser: conectar Meta/OpenAI → testar ponta a ponta → corrigir bugs reais → pacote final V1. A Operação Marketing completa fica fora deste fechamento até você definir as regras dela.</p></div><Link className="button gold" href="/central/integracoes">Abrir Integrações</Link></div></article>
  </>;
}
