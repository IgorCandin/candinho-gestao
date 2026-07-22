import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, FileText, Images, Lightbulb, Megaphone, Sparkles, Workflow } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("marketing_projects")
    .select("id,status,processing_status")
    .order("updated_at", { ascending: false });

  const total = projects?.length ?? 0;
  const pending = (projects ?? []).filter((item) => ["pending", "processing"].includes(String(item.processing_status))).length;
  const ready = (projects ?? []).filter((item) => item.processing_status === "ready").length;

  return <>
    <section className="operation-home-hero operation-home-no-heading">
      <Link className="operation-home-primary" href="/marketing/ideias?novo=1">
        <Lightbulb size={24}/>
        <div>
          <span>Ação principal</span>
          <strong>Registrar ideia ou anexar material</strong>
          <small>O PDF entra no Marketing, é interpretado pelo Nexus e vira uma página de roteiro.</small>
        </div>
      </Link>

      <div className="operation-home-kpis">
        <Link href="/marketing/ideias">
          <span>Caixa de ideias</span>
          <strong>{total}</strong>
          <small>{ready} página(s) pronta(s) · {pending} em processamento</small>
        </Link>
        <Link href="/marketing/planejamento">
          <span>Planejamento</span>
          <strong>Agenda</strong>
          <small>Tarefas e datas da própria Operação Marketing</small>
        </Link>
        <Link href="/marketing/ideias">
          <span>Organização inteligente</span>
          <strong>Nexus</strong>
          <small>PDFs são lidos e transformados em páginas estruturadas.</small>
        </Link>
      </div>
    </section>

    <section className="central-launch-grid marketing-foundation-links">
      <Link href="/marketing/ideias" className="central-launch-card primary">
        <Images size={24}/>
        <span>
          <strong>Ideias e roteiros</strong>
          <small>Envie PDFs e consulte cada material como uma página própria dentro do Marketing.</small>
        </span>
      </Link>

      <Link href="/marketing/planejamento" className="central-launch-card">
        <CalendarDays size={24}/>
        <span>
          <strong>Calendário de produção</strong>
          <small>Planeje gravação, edição, publicação e campanhas sem sair do Marketing.</small>
        </span>
      </Link>

      <Link href="/marketing/ideias" className="central-launch-card">
        <Sparkles size={24}/>
        <span>
          <strong>Organizar com Nexus</strong>
          <small>Resumo, objetivo, produto, formato, gancho, roteiro e CTA extraídos do PDF.</small>
        </span>
      </Link>

      <Link href="/central" className="central-launch-card">
        <Megaphone size={24}/>
        <span>
          <strong>Candinho Central</strong>
          <small>A Central continua sendo o centro de comando geral, mas não é mais a caixa de entrada do Marketing.</small>
        </span>
      </Link>
    </section>

    <article className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head">
        <div>
          <h2>Fluxo oficial da Operação Marketing</h2>
          <p>Agora o fluxo deixa de ser apenas visual: a entrada e as páginas de roteiro ficam dentro do próprio Marketing.</p>
        </div>
        <Workflow size={20}/>
      </div>

      <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        {[
          ["1", "Ideia / Material", "Você escreve uma ideia ou anexa um PDF diretamente no Marketing."],
          ["2", "Interpretação", "O Nexus lê o PDF, resume e organiza o conteúdo sem apagar o original."],
          ["3", "Projeto / Roteiro", "O material ganha uma página com objetivo, produto, formato, gancho, roteiro e CTA."],
          ["4", "Produção", "Use o Planejamento do Marketing para gravar, editar e publicar."],
          ["5", "Resultado", "Depois entram métricas, leads, vendas e aprendizado da campanha."],
        ].map(([number, title, description]) => (
          <div key={number} style={{ padding: 14, border: "1px solid var(--line)", borderRadius: 13, background: "rgba(255,255,255,.016)", display: "grid", gap: 6 }}>
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
          <h2>Automação inteligente ativa</h2>
          <p>Novos PDFs enviados pelo Marketing são processados automaticamente. Os PDFs antigos enviados na Central com escopo Marketing serão processados ao abrir a Caixa de ideias.</p>
        </div>
        <FileText size={20}/>
      </div>
    </article>
  </>;
}
