import Link from "next/link";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { EditLeadForm } from "@/components/edit-lead-form";
import { PageHeader } from "@/components/page-header";
import { getCustomerOptions, getLeadDetails, getProductOptions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [lead, customers, products] = await Promise.all([
    getLeadDetails(id),
    getCustomerOptions(),
    getProductOptions(),
  ]);

  if (!lead) notFound();

  if (lead.quote_id) {
    return (
      <>
        <DemoBanner />
        <PageHeader
          eyebrow="Lead"
          title={`Editar · ${lead.customer_name}`}
          description="Este lead já possui orçamento vinculado. Para manter produto, sabor, preço e proposta sincronizados, faça a alteração pelo próprio orçamento."
          action={
            <div className="page-header-actions">
              <Link className="button gold" href={`/vendas/nova?quote=${lead.quote_id}`}>
                <FilePenLine size={16} />Editar orçamento
              </Link>
              <Link className="button ghost" href={`/leads/${lead.id}`}>
                <ArrowLeft size={16} />Voltar
              </Link>
            </div>
          }
        />
        <article className="panel">
          <div className="empty">
            <strong>O lead já entrou no fluxo de orçamento</strong>
            Alterar o produto diretamente aqui faria o lead ficar diferente da proposta já criada. Use “Editar orçamento” acima.
          </div>
        </article>
      </>
    );
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("sale_items")
    .select("product_id,flavor_id")
    .eq("sale_id", id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const initialProductId = typeof item?.product_id === "string" ? item.product_id : lead.product_id ?? "";
  const initialFlavorId = typeof item?.flavor_id === "string" ? item.flavor_id : "";

  return (
    <>
      <DemoBanner />
      <PageHeader
        eyebrow="Comercial · Lead"
        title={`Editar · ${lead.customer_name}`}
        description="Atualize o interesse sem apagar o histórico nem cadastrar outro lead."
        action={
          <Link className="button ghost" href={`/leads/${lead.id}`}>
            <ArrowLeft size={16} />Voltar
          </Link>
        }
      />
      <EditLeadForm
        leadId={lead.id}
        customers={customers}
        products={products}
        initialCustomerId={lead.customer_id ?? ""}
        initialProductId={initialProductId}
        initialFlavorId={initialFlavorId}
        initialStatus={lead.lead_status ?? "Perguntou sobre"}
        initialNotes={lead.notes ?? ""}
      />
    </>
  );
}
