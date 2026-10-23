import { redirect } from "next/navigation";
import Link from "next/link";
import { CommercialContactQueue } from "@/components/commercial-contact-queue";
import { DemoBanner } from "@/components/demo-banner";
import { PageHeader } from "@/components/page-header";
import type { CommercialContactQueueSnapshot } from "@/lib/commercial-contact-types";
import { emptyCommercialContactQueue } from "@/lib/commercial-contact-types";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function CommercialContactQueuePage({ companyMode = false }: { companyMode?: boolean } = {}) {
  const access = await getCurrentUserAccess();

  if (!(access.role === "admin" || access.canWriteSupplements)) {
    redirect(companyMode ? "/company/inicio" : "/suplementos/inicio");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commercial_contact_queue_people_v1", {
    p_limit: 40,
  });

  if (error) throw error;

  const snapshot =
    (data as CommercialContactQueueSnapshot | null) ??
    emptyCommercialContactQueue();

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow={companyMode ? "Candinho Company · Suplementos" : "Candinho Suplementos"}
        title="Fila Comercial"
        description="Uma pessoa por vez. Se o mesmo cliente tiver mais de um motivo comercial, o Nexus junta tudo no mesmo contato e mantém a prioridade pelo assunto mais urgente."
        action={companyMode ? <Link className="button ghost" href="/company/nexus/fila">Voltar à Fila Única</Link> : undefined}
      />
      <CommercialContactQueue snapshot={snapshot} companyMode={companyMode} />
    </>
  );
}
