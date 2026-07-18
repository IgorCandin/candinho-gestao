import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, FileText, Images, Lightbulb, Megaphone, Sparkles, Workflow } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";

export default async function MarketingPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) redirect("/dashboard");

  return <>
    <section className="operation-home-hero operation-home-no-heading">
      <Link className="operation-home-primary" href="/central/midia?scope=marketing">
        <Lightbulb size={24}/>
        <div>
          <span>Ação principal</span>
          <strong>Registrar ideia ou anexar material</strong>
          <small>PDF, imagem, vídeo, referência ou briefing para organizar depois</small>
        </div>
      </Link>

      <div className="operation-home-kpis">
        <Link href="/central/midia?scope=marketing">
          <span>Caixa de ideias</span>
          <strong>Entrada</strong>
          <small>Guarde referências sem perder o arquivo original</small>
        </Link>
        <Link href="/central/agenda?scope=marketing">
          <span>Planejamento</span>
          <strong>Agenda</strong>
          <small>Transforme ideias aprovadas em tarefas e datas</small>
        </Link>
        <Link href="/central/nexus">
          <span>Organização inteligente</span>
          <strong>Nexus</strong>
          <small>Base pronta para resumir e classificar materiais</small>
        </Link>
      </div>
    </section>

    <section className="central-launch-grid marketing-foundation-links">
      <Link href="/central/midia?scope=marketing" className="central-launch-card primary">
        <Images size={24}/>
        <span>
          <strong>Ideias e arquivos</strong>
          <small>Anexe PDFs, imagens, vídeos e referências. O original continua preservado.</small>
        </span>
      </Link>

      <Link href="/central/agenda?scope=marketing" className="central-launch-card">
        <CalendarDays size={24}/>
        <span>
          <strong>Calendário de produção</strong>
          <small>Planeje gravação, edição, publicação e campanhas.</small>
        </span>
      </Link>

      <Link href="/central/nexus" className="central-launch-card">
        <Sparkles size={24}/>
        <span>
          <strong>Organizar com Nexus</strong>
          <small>Use a camada de IA existente para apoiar classificação e resumo dos materiais.</small>
        </span>
      </Link>

      <Link href="/central" className="central-launch-card">
        <Megaphone size={24}/>
        <span>
          <strong>Candinho Central</strong>
          <small>Leve tarefas, clientes e atendimento para o centro de comando.</small>
        </span>
      </Link>
    </section>

    <article className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head">
        <div>
          <h2>Fluxo oficial da Operação Marketing</h2>
          <p>A estrutura junta a ideia que você explicou com a organização de campanhas que já fazia sentido para a Company.</p>
        </div>
        <Workflow size={20}/>
      </div>

      <div
        className="panel-body"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 10,
        }}
      >
        {[
          ["1", "Ideia / Material", "Você escreve uma ideia ou anexa PDF, imagem, vídeo e referência."],
          ["2", "Interpretação", "O material é resumido e organizado sem apagar o arquivo original."],
          ["3", "Projeto / Roteiro", "A ideia vira uma página estruturada com objetivo, produto, formato e roteiro."],
          ["4", "Produção", "Status: ideia, planejar, gravar, editar e publicar."],
          ["5", "Resultado", "Depois entram métricas, leads, vendas e aprendizado da campanha."],
        ].map(([number, title, description]) => (
          <div
            key={number}
            style={{
              padding: 14,
              border: "1px solid var(--line)",
              borderRadius: 13,
              background: "rgba(255,255,255,.016)",
              display: "grid",
              gap: 6,
            }}
          >
            <span className="badge gold" style={{ width: "fit-content" }}>{number}</span>
            <strong style={{ fontSize: 12 }}>{title}</strong>
            <small style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.5 }}>{description}</small>
          </div>
        ))}
      </div>
    </article>

    <article className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head">
        <div>
          <h2>Automação inteligente — próxima camada</h2>
          <p>O fluxo visual já fica definido neste pacote. A criação automática de uma página de roteiro a partir do conteúdo integral de um PDF exige a etapa de extração/processamento do arquivo.</p>
        </div>
        <FileText size={20}/>
      </div>
    </article>
  </>;
}
