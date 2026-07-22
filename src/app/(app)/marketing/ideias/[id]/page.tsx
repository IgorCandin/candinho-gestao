import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Sparkles } from "lucide-react";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingIdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) redirect("/dashboard");

  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("marketing_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!project) notFound();

  let asset: Record<string, unknown> | null = null;
  let signedUrl: string | null = null;

  if (project.media_asset_id) {
    const assetResult = await supabase
      .from("central_media_assets")
      .select("id,storage_path,original_filename,mime_type,created_at")
      .eq("id", project.media_asset_id)
      .maybeSingle();

    asset = assetResult.data as Record<string, unknown> | null;

    if (asset?.storage_path) {
      const signed = await supabase.storage
        .from("central-media")
        .createSignedUrl(String(asset.storage_path), 3600);
      signedUrl = signed.data?.signedUrl ?? null;
    }
  }

  const metadata = (project.ai_metadata ?? {}) as Record<string, unknown>;
  const sections = Array.isArray(metadata.sections) ? metadata.sections as Array<Record<string, unknown>> : [];

  return (
    <section>
      <Link href="/marketing/ideias" className="button ghost compact-button" style={{ marginBottom: 14 }}>
        <ArrowLeft size={14}/>Voltar para ideias
      </Link>

      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Marketing · Roteiro</div>
          <h1>{project.title}</h1>
          <p>
            {project.processing_status === "ready"
              ? "Página estruturada automaticamente a partir do material original."
              : project.processing_status === "error"
                ? "A página foi criada, mas a interpretação automática precisa ser executada novamente."
                : "O Nexus ainda está interpretando este material."}
          </p>
        </div>
        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noreferrer" className="button gold">
            <ExternalLink size={16}/>Abrir PDF original
          </a>
        )}
      </div>

      <div className="grid stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <div className="stat-head"><span>Status Nexus</span><span className="stat-icon"><Sparkles size={17}/></span></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{project.processing_status === "ready" ? "Pronto" : project.processing_status === "error" ? "Erro" : "Processando"}</div>
          <div className="stat-note">Atualizado em {formatDateTime(project.updated_at)}</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Produto / tema</span><span className="stat-icon"><FileText size={17}/></span></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{project.product || "—"}</div>
          <div className="stat-note">tema principal identificado no material</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Formato</span><span className="stat-icon"><FileText size={17}/></span></div>
          <div className="stat-value" style={{ fontSize: 20 }}>{project.content_format || "—"}</div>
          <div className="stat-note">formato sugerido ou descrito no PDF</div>
        </article>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        <article className="panel">
          <div className="panel-head"><div><h2>Resumo</h2><p>Leitura rápida do material.</p></div></div>
          <div className="panel-body" style={{ whiteSpace: "pre-wrap", color: "var(--muted)", fontSize: 11, lineHeight: 1.7 }}>
            {project.summary || "Aguardando interpretação do Nexus."}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Direção</h2><p>Objetivo e público identificados.</p></div></div>
          <div className="panel-body" style={{ display: "grid", gap: 12 }}>
            <div><small style={{ color: "var(--muted)" }}>OBJETIVO</small><strong style={{ display: "block", marginTop: 4 }}>{project.objective || "—"}</strong></div>
            <div><small style={{ color: "var(--muted)" }}>PÚBLICO</small><strong style={{ display: "block", marginTop: 4 }}>{project.audience || "—"}</strong></div>
            <div><small style={{ color: "var(--muted)" }}>GANCHO</small><strong style={{ display: "block", marginTop: 4 }}>{project.hook || "—"}</strong></div>
            <div><small style={{ color: "var(--muted)" }}>CTA</small><strong style={{ display: "block", marginTop: 4 }}>{project.cta || "—"}</strong></div>
          </div>
        </article>
      </div>

      <article className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <div>
            <h2>Roteiro organizado</h2>
            <p>Conteúdo copiado e reestruturado a partir do PDF.</p>
          </div>
        </div>
        <div className="panel-body" style={{ whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.8 }}>
          {project.script_text || "O roteiro aparecerá aqui assim que o Nexus terminar a interpretação."}
        </div>
      </article>

      {sections.length > 0 && (
        <article className="panel" style={{ marginTop: 14 }}>
          <div className="panel-head"><div><h2>Seções do material</h2><p>Blocos identificados no documento.</p></div></div>
          <div className="panel-body" style={{ display: "grid", gap: 10 }}>
            {sections.map((section, index) => (
              <div key={index} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,.015)" }}>
                <strong style={{ display: "block", marginBottom: 6 }}>{String(section.title ?? `Seção ${index + 1}`)}</strong>
                <span style={{ color: "var(--muted)", fontSize: 10, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{String(section.content ?? "")}</span>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
