import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Images, Megaphone, MessagesSquare, Sparkles } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";

export default async function MarketingPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) redirect("/dashboard");

  return <>
    <section className="marketing-foundation-hero marketing-foundation-hero-clean">
      <article className="marketing-foundation-brand panel">
        <div className="marketing-foundation-copy">
          <span className="marketing-status-pill"><Sparkles size={14}/>Fundação ativa</span>
          <h2>Operação pronta para receber a próxima definição.</h2>
          <p>Nenhuma regra de vendas, estoque ou financeiro foi criada por suposição. A base de acesso, identidade e integração com a Central já está preparada.</p>
        </div>
      </article>
    </section>

    <section className="central-launch-grid marketing-foundation-links">
      <Link href="/central/midia?scope=marketing" className="central-launch-card primary"><Images size={24}/><span><strong>Mídia do Marketing</strong><small>Organize fotos, vídeos e materiais com o escopo Marketing.</small></span></Link>
      <Link href="/central/agenda?scope=marketing" className="central-launch-card"><CalendarDays size={24}/><span><strong>Agenda</strong><small>Planeje tarefas e compromissos ligados à operação.</small></span></Link>
      <Link href="/central/inbox?scope=marketing" className="central-launch-card"><MessagesSquare size={24}/><span><strong>Atendimento</strong><small>O escopo já está aceito pela Central para futuras integrações.</small></span></Link>
      <Link href="/central" className="central-launch-card"><Megaphone size={24}/><span><strong>Candinho Central</strong><small>Volte ao centro de comando da Company.</small></span></Link>
    </section>

    <article className="panel marketing-definition-panel">
      <div className="panel-head"><div><h2>O que ficou propositalmente em aberto</h2><p>Essa etapa prepara a estrutura sem decidir por você como o Marketing deve funcionar.</p></div></div>
      <div className="panel-body marketing-definition-grid">
        <div><strong>Projetos e campanhas</strong><span>Aguardando definição do seu fluxo.</span></div>
        <div><strong>Calendário editorial</strong><span>Pode ser integrado quando você explicar a rotina.</span></div>
        <div><strong>Métricas e metas</strong><span>Nenhum indicador foi inventado nesta fase.</span></div>
        <div><strong>Custos e orçamento</strong><span>Sem vínculo financeiro automático até você definir as regras.</span></div>
      </div>
    </article>
  </>;
}
