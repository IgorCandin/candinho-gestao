import Link from "next/link";
import { ArrowLeft, Bug, CheckCircle2, Clock3, Monitor } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  UxIssueReportList,
  type UxIssueRow,
} from "@/components/ux-issue-report-list";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NexusUxIssuesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ux_issue_reports_overview")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw error;

  const rows = (data ?? []) as UxIssueRow[];
  const pending = rows.filter((row) => row.is_pending);
  const high = pending.filter((row) => row.severity === "high" || row.severity === "critical");
  const layout = pending.filter((row) => row.category === "layout");
  const resolved = rows.filter((row) => row.status === "resolved");

  return (
    <>
      <PageHeader
        eyebrow="Nexus · Qualidade"
        title="Quebras de UX / Função"
        description="Caixa isolada para anotar problemas enquanto você trabalha. Cada relato recebe automaticamente rota, dispositivo, dimensão da tela e últimas navegações da sessão."
        action={
          <Link className="button ghost" href="/suplementos/nexus">
            <ArrowLeft size={15} /> Nexus
          </Link>
        }
      />

      <section className="grid stats-grid">
        <StatCard
          href="/suplementos/nexus/ux"
          label="Pendentes"
          value={String(pending.length)}
          note={`${high.length} de alta prioridade`}
          icon={Clock3}
        />
        <StatCard
          href="/suplementos/nexus/ux"
          label="Layout"
          value={String(layout.length)}
          note="Menus, cortes, overflow e responsividade"
          icon={Monitor}
        />
        <StatCard
          href="/suplementos/nexus/ux"
          label="Registrados"
          value={String(rows.length)}
          note="Histórico capturado"
          icon={Bug}
        />
        <StatCard
          href="/suplementos/nexus/ux"
          label="Resolvidos"
          value={String(resolved.length)}
          note="Problemas já tratados"
          icon={CheckCircle2}
        />
      </section>

      <UxIssueReportList rows={rows} />
    </>
  );
}
