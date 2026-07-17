import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Inbox, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCentralAiInsights } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function parseInsight(content: string) {
  try { return JSON.parse(content) as Record<string, unknown>; }
  catch { return null; }
}

export default async function NexusPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness)) redirect("/dashboard");
  const insights = await getCentralAiInsights();

  return <>
    <PageHeader eyebrow="Candinho Central" title="Nexus IA" description="O Nexus prepara sugestões e insights usando o contexto permitido. Nada é enviado automaticamente ao cliente." action={<Link className="button gold" href="/central/inbox"><Inbox size={16}/>Abrir Inbox</Link>}/>

    <article className="panel nexus-safety-banner"><div className="panel-body"><Bot size={24}/><div><strong>Humano no controle</strong><p>O Nexus sugere respostas, considera estoque e restrições já cadastradas, mas você revisa antes de qualquer envio. Questões médicas sensíveis devem continuar com revisão humana.</p></div></div></article>

    <section className="nexus-insight-list">
      {insights.length === 0 ? <article className="panel"><div className="empty"><Sparkles size={27}/><strong>Nenhum insight gerado ainda</strong>Abra uma conversa no Inbox e use “Sugerir com Nexus”. A função ficará disponível quando a OPENAI_API_KEY estiver configurada.</div></article> : insights.map((insight) => {
        const parsed = parseInsight(insight.content);
        const reply = typeof parsed?.suggested_reply === "string" ? parsed.suggested_reply : insight.content;
        const requiresHuman = Boolean(parsed?.requires_human);
        const reason = typeof parsed?.reason === "string" ? parsed.reason : null;
        return <article className="panel nexus-insight-card" key={insight.id}>
          <div className="panel-head"><div><h2>{insight.title}</h2><p>{formatDateTime(insight.generated_at)} · {insight.operation_scope}</p></div><span className={`badge ${requiresHuman ? "orange" : "green"}`}>{requiresHuman ? <><TriangleAlert size={13}/>Revisão necessária</> : "Pronto para revisar"}</span></div>
          <div className="panel-body"><blockquote>{reply}</blockquote>{reason && <p><strong>Por quê:</strong> {reason}</p>}{insight.conversation_id && <Link className="button ghost compact-button" href={`/central/inbox?conversa=${insight.conversation_id}`}>Abrir conversa</Link>}</div>
        </article>;
      })}
    </section>
  </>;
}
