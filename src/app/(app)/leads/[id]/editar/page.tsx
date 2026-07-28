import Link from "next/link";
import {
  ArrowLeft,
  FilePenLine,
} from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import { EditLeadForm } from "@/components/edit-lead-form";
import { PageHeader } from "@/components/page-header";
import {
  getCustomerOptions,
  getLeadDetails,
  getProductOptions,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, customers, products] =
    await Promise.all([
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
          description="Este lead já possui orçamento vinculado. Para manter produto, combo, sabor, preço e proposta sincronizados, faça a alteração pelo próprio orçamento."
          action={
            <div className="page-header-actions">
              <Link
                className="button gold"
                href={`/vendas/nova?quote=${lead.quote_id}`}
              >
                <FilePenLine
                  size={16}
                />
                Editar orçamento
              </Link>

              <Link
                className="button ghost"
                href={`/leads/${lead.id}`}
              >
                <ArrowLeft
                  size={16}
                />
                Voltar
              </Link>
            </div>
          }
        />

        <article className="panel">
          <div className="empty">
            <strong>
              O lead já entrou no fluxo de
              orçamento
            </strong>
            Alterar produto ou combo
            diretamente aqui faria o lead
            ficar diferente da proposta já
            criada. Use “Editar orçamento”
            acima.
          </div>
        </article>
      </>
    );
  }

  const supabase =
    await createClient();

  const [
    leadMetaResult,
    itemResult,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("lead_combo_id")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("sale_items")
      .select(
        "product_id,flavor_id,quantity,created_at",
      )
      .eq("sale_id", id)
      .order("created_at"),
  ]);

  if (leadMetaResult.error) {
    throw leadMetaResult.error;
  }

  if (itemResult.error) {
    throw itemResult.error;
  }

  const items =
    itemResult.data ?? [];

  const firstItem =
    items[0] ?? null;

  const initialComboId =
    typeof leadMetaResult.data
      ?.lead_combo_id === "string"
      ? leadMetaResult.data
          .lead_combo_id
      : "";

  const initialProductId =
    !initialComboId &&
    typeof firstItem?.product_id ===
      "string"
      ? firstItem.product_id
      : !initialComboId
        ? lead.product_id ?? ""
        : "";

  const initialFlavorId =
    !initialComboId &&
    typeof firstItem?.flavor_id ===
      "string"
      ? firstItem.flavor_id
      : "";

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Comercial · Lead"
        title={`Editar · ${lead.customer_name}`}
        description="Troque entre produto individual e combo sem apagar o histórico nem cadastrar outro lead."
        action={
          <Link
            className="button ghost"
            href={`/leads/${lead.id}`}
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      />

      <EditLeadForm
        leadId={lead.id}
        customers={customers}
        products={products}
        initialCustomerId={
          lead.customer_id ?? ""
        }
        initialProductId={
          initialProductId
        }
        initialFlavorId={
          initialFlavorId
        }
        initialComboId={
          initialComboId
        }
        initialItems={items.map(
          (item) => ({
            productId: String(
              item.product_id,
            ),
            flavorId:
              typeof item.flavor_id ===
              "string"
                ? item.flavor_id
                : "",
            quantity: Number(
              item.quantity ?? 1,
            ),
          }),
        )}
        initialStatus={
          lead.lead_status ??
          "Perguntou sobre"
        }
        initialNotes={
          lead.notes ?? ""
        }
      />
    </>
  );
}
