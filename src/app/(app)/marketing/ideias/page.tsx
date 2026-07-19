import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Sparkles, ChevronRight, Clock3, CheckCircle2, TriangleAlert } from "lucide-react";
import { MarketingIdeaUploader } from "@/components/marketing-idea-uploader";
import { MarketingPendingProcessor } from "@/components/marketing-pending-processor";
import { getCurrentUserAccess } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function statusMeta(status: string) {
  if (status === "ready") return { label: "Página pronta", icon: CheckCircle2, className: "green" };
  if (status === "error") return { label: "Erro ao interpretar", icon: TriangleAlert, className: "red" };
  if (status === "processing") return { label: "Interpretando", icon: Sparkles, className: "gold" };
  return { label: "Aguardando Nexus", icon: Clock3, className: "gray" };
}

export default async function MarketingIdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessMarketing)) redirect("/dashboard");

  const params = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_projects")
    .select("id,media_asset_id,title,summary,product,content_format,status,processing_status,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const projects = data ?? [];
  const pendingAssetIds = projects
    .filter((item) => item.media_asset_id && item.processing_status === "pending")
    .map((item) => String(item.media_asset_id));

  return (
    <section>
      <div className="page-header">
        <div>
          <div className="eyebrow">Candinho Marketing</div>
          <h1>Ideias e roteiros</h1>
          <p>Todo PDF enviado aqui vira uma página de trabalho dentro da Operação Marketing.</p>
        </div>
      </div>

      <MarketingPendingProcessor assetIds={pendingAssetIds}/>
      <MarketingIdeaUploader openByDefault={params.novo === "1"}/>

      <div className="grid stats-grid" style={{ marginBottom: 18 }}>
        <article className="stat-card">
          <div className="stat-head"><span>Total</span><span className="stat-icon"><FileText size={17}/></span></div>
          <div className="stat-value">{projects.length}</div>
          <div className="stat-note">ideias e roteiros registrados</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Páginas prontas</span><span className="stat-icon"><CheckCircle2 size={17}/></span></div>
          <div className="stat-value">{projects.filter((item) => item.processing_status === "ready").length}</div>
          <div className="stat-note">materiais já interpretados pelo Nexus</div>
        </article>
        <article className="stat-card">
          <div className="stat-head"><span>Em processamento</span><span className="stat-icon"><Sparkles size={17}/></span></div>
          <div className="stat-value">{projects.filter((item) => ["pending","processing"].includes(String(item.processing_status))).length}</div>
          <div className="stat-note">PDFs aguardando ou sendo interpretados</div>
        </article>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {projects.map((project) => {
          const meta = statusMeta(String(project.processing_status));
          const Icon = meta.icon;
          return (
            <Link
              href={`/marketing/ideias/${project.id}`}
              className="panel"
              key={project.id}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "center", gap: 14 }}>
                <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: "var(--gold-soft)", color: "var(--gold)" }}>
                  <FileText size={20}/>
                </span>
                <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
                  <strong style={{ fontSize: 13 }}>{project.title}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 9, lineHeight: 1.5 }}>
                    {project.summary || [project.product, project.content_format].filter(Boolean).join(" · ") || "Material aguardando interpretação."}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 8 }}>
                    <Icon size={12}/><span className={`badge ${meta.className}`}>{meta.label}</span> · Atualizado {formatDateTime(project.updated_at)}
                  </span>
                </div>
                <ChevronRight size={18}/>
              </div>
            </Link>
          );
        })}

        {projects.length === 0 && (
          <article className="panel">
            <div className="empty">
              <FileText size={28}/>
              <strong>Nenhuma ideia registrada</strong>
              Envie o primeiro PDF ou escreva uma ideia acima.
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
