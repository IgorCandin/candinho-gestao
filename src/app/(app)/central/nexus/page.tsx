import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, CheckCircle2, Inbox, Link2, Sparkles, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCentralAiInsights, getCentralIntegrationReadiness } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

function parseInsight(content: string) {
  try { return JSON.parse(content) as Record<string, unknown>; }
  catch { return null; }
}

export default async function NexusPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const [insights, readiness] = await Promise.all([getCentralAiInsights(), access.canManageUsers ? getCentralIntegrationReadiness() : Promise.resolve(null)]);
  const aiReady = Boolean(readiness?.openai.ready);

  return <>
    <PageHeader eyebrow="Candinho Central" title="Nexus IA" description="O Nexus prepara sugestões e insights usando o contexto permitido. Nada é enviado automaticamente ao cliente." action={<Link className="button gold" href="/central/inbox"><Inbox size={16}/>Abrir Inbox</Link>}/>

    <article className={`panel nexus-readiness-banner ${aiReady ? "ready" : "waiting"}`}><div className="panel-body">{aiReady ? <CheckCircle2 size={24}/> : <TriangleAlert size={24}/>}<div><strong>{aiReady ? "Nexus pronto para uso" : "Nexus aguardando chave da OpenAI"}</strong><p>{aiReady ? `Modelo de atendimento: ${readiness?.openai.nexus_model ?? "configurado"}. As respostas continuam sempre sob sua revisão.` : "A estrutura está pronta, mas nenhuma chamada de IA será feita até a OPENAI_API_KEY ser configurada nos Secrets."}</p></div>{access.canManageUsers && !aiReady && <Link className="button ghost compact-button" href="/central/integracoes"><Link2 size={14}/>Ver Integrações</Link>}</div></article>

    <article className="panel nexus-safety-banner"><div className="panel-body"><Bot size={24}/><div><strong>Humano no controle</strong><p>O Nexus sugere respostas, considera estoque e restrições já cadastradas, mas você revisa antes de qualquer envio. Questões médicas sensíveis continuam exigindo revisão humana.</p></div></div></article>

    <section className="nexus-insight-list">
      {insights.length === 0 ? <article className="panel"><div className="empty"><Sparkles size={27}/><strong>Nenhum insight gerado ainda</strong>{aiReady ? "Abra uma conversa no Inbox e use “Sugerir com Nexus”." : "Assim que a chave da OpenAI for configurada, use “Sugerir com Nexus” dentro de uma conversa."}</div></article> : insights.map((insight) => {
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
