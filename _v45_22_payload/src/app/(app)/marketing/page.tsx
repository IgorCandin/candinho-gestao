import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Images,
  Lightbulb,
  Sparkles,
  Workflow,
} from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("marketing_projects")
    .select("id,status,processing_status")
    .order("updated_at", { ascending: false });

  const total = projects?.length ?? 0;
  const pending = (projects ?? []).filter((item) =>
    ["pending", "processing"].includes(String(item.processing_status)),
  ).length;
  const ready = (projects ?? []).filter(
    (item) => item.processing_status === "ready",
  ).length;

  return (
    <>
      <section className="operation-home-hero operation-home-no-heading">
        <Link
          className="operation-home-primary"
          href="/central/marketing/ideias?novo=1"
        >
          <Lightbulb size={24} />
          <div>
            <span>Central · Marketing</span>
            <strong>Registrar ideia ou anexar material</strong>
            <small>
              O material entra no módulo de Marketing da Central, é
              interpretado pelo Nexus e vira uma página de roteiro.
            </small>
          </div>
        </Link>

        <div className="operation-home-kpis">
          <Link href="/central/marketing/ideias">
            <span>Caixa de ideias</span>
            <strong>{total}</strong>
            <small>
              {ready} página(s) pronta(s) · {pending} em processamento
            </small>
          </Link>
          <Link href="/central/marketing/planejamento">
            <span>Planejamento</span>
            <strong>Agenda</strong>
            <small>Gravação, edição, publicação e campanhas</small>
          </Link>
          <Link href="/central/marketing/ideias">
            <span>Organização inteligente</span>
            <strong>Nexus</strong>
            <small>PDFs viram páginas estruturadas e pesquisáveis.</small>
          </Link>
        </div>
      </section>

      <section className="central-launch-grid marketing-foundation-links">
        <Link
          href="/central/marketing/ideias"
          className="central-launch-card primary"
        >
          <Images size={24} />
          <span>
            <strong>Ideias e roteiros</strong>
            <small>
              Materiais, PDFs e roteiros dentro da própria Central.
            </small>
          </span>
        </Link>

        <Link
          href="/central/marketing/planejamento"
          className="central-launch-card"
        >
          <CalendarDays size={24} />
          <span>
            <strong>Calendário de produção</strong>
            <small>
              Planeje gravação, edição, publicação e campanhas.
            </small>
          </span>
        </Link>

        <Link
          href="/central/marketing/ideias"
          className="central-launch-card"
        >
          <Sparkles size={24} />
          <span>
            <strong>Organizar com Nexus</strong>
            <small>
              Resumo, objetivo, produto, formato, gancho, roteiro e CTA.
            </small>
          </span>
        </Link>

        <Link href="/central/agenda" className="central-launch-card">
          <CalendarDays size={24} />
          <span>
            <strong>Agenda Global</strong>
            <small>
              As tarefas de Marketing também aparecem no calendário geral.
            </small>
          </span>
        </Link>
      </section>

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Fluxo de Marketing dentro da Central</h2>
            <p>
              Marketing deixa de competir com as operações principais e
              passa a funcionar como um núcleo especializado da Central.
            </p>
          </div>
          <Workflow size={20} />
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
            ["1", "Ideia / Material", "Escreva uma ideia ou anexe um PDF."],
            ["2", "Interpretação", "O Nexus resume e organiza o conteúdo."],
            ["3", "Projeto / Roteiro", "Objetivo, formato, gancho, roteiro e CTA."],
            ["4", "Produção", "Planeje gravação, edição e publicação."],
            ["5", "Resultado", "Depois entram métricas, leads, vendas e aprendizado."],
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
              <span className="badge gold" style={{ width: "fit-content" }}>
                {number}
              </span>
              <strong style={{ fontSize: 12 }}>{title}</strong>
              <small
                style={{
                  color: "var(--muted)",
                  fontSize: 9,
                  lineHeight: 1.5,
                }}
              >
                {description}
              </small>
            </div>
          ))}
        </div>
      </article>

      <article className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head">
          <div>
            <h2>Automação inteligente ativa</h2>
            <p>
              PDFs continuam sendo processados automaticamente; o endereço
              canônico agora fica em Central → Marketing.
            </p>
          </div>
          <FileText size={20} />
        </div>
      </article>
    </>
  );
}
