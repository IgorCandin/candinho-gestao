import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Handshake,
  Link2,
  Plus,
  UsersRound,
} from "lucide-react";
import { CustomerLinksWorkspace } from "@/components/customer-links-workspace";
import type {
  CustomerLinkRow,
  PendingPartnerLinkRow,
} from "@/components/customer-links-workspace";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CustomerRelationshipsPage() {
  const supabase = await createClient();

  const [
    { data: links, error: linksError },
    { data: pending, error: pendingError },
  ] = await Promise.all([
    supabase
      .from("customer_links_overview_v1")
      .select("*")
      .eq("active", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("customer_pending_partner_links_v1")
      .select("*")
      .order("last_sale_at", { ascending: false }),
  ]);

  if (linksError) throw linksError;
  if (pendingError) throw pendingError;

  const linkRows = (links ?? []) as CustomerLinkRow[];
  const pendingRows = (pending ?? []) as PendingPartnerLinkRow[];
  const partnerCount = linkRows.filter((row) => row.link_group === "partner").length;
  const relatedCount = linkRows.filter((row) => row.link_group === "related").length;

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="CRM · Rede"
        title="Vínculos"
        description="Um único espaço para confirmar vínculos pendentes, relações com parceiros e pessoas relacionadas. O Nexus apresenta evidências, mas nunca define sozinho qual é a relação."
        action={
          <div className="page-header-actions">
            <Link className="button gold" href="/clientes/novo">
              <Plus size={16} /> Novo cliente com vínculo
            </Link>
            <Link className="button ghost" href="/clientes">
              <ArrowLeft size={16} /> CRM
            </Link>
          </div>
        }
      />

      <section className="grid stats-grid">
        <StatCard
          href="/clientes/relacionamentos"
          label="Pendentes"
          value={String(pendingRows.length)}
          note="Venda atribuída sem vínculo formal confirmado"
          icon={Clock3}
        />
        <StatCard
          href="/clientes/relacionamentos"
          label="Parcerias"
          value={String(partnerCount)}
          note="Clientes conectados a parceiros"
          icon={Handshake}
        />
        <StatCard
          href="/clientes/relacionamentos"
          label="Relacionados"
          value={String(relatedCount)}
          note="Família, amizade, indicação e contexto"
          icon={UsersRound}
        />
        <StatCard
          href="/clientes/relacionamentos"
          label="Total de vínculos"
          value={String(linkRows.length)}
          note="Rede explícita cadastrada no CRM"
          icon={Link2}
        />
      </section>

      <CustomerLinksWorkspace links={linkRows} pending={pendingRows} />
    </>
  );
}
