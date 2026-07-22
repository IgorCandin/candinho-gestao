import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ReturnCaseCreateForm,
  type ReturnEligibleItem,
} from "@/components/return-case-create-form";
import { PageHeader } from "@/components/page-header";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function NewReturnCasePage({
  searchParams,
}: {
  searchParams: Promise<{ operacao?: string }>;
}) {
  const params = await searchParams;
  const access = await getCurrentUserAccess();

  const operation: "supplements" | "fitness" =
    params.operacao === "fitness" ? "fitness" : "supplements";

  if (
    (operation === "supplements" && !access.canAccessSupplements) ||
    (operation === "fitness" && !access.canAccessFitness)
  ) {
    throw new Error("Acesso negado");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("return_eligible_sale_items")
    .select("*")
    .eq("operation", operation)
    .gt("quantity_available", 0)
    .order("sale_on", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).map((row) => ({
    operation,
    sale_id: String(row.sale_id),
    sale_on: String(row.sale_on),
    delivered_on:
      typeof row.delivered_on === "string" ? row.delivered_on : null,
    customer_id:
      typeof row.customer_id === "string" ? row.customer_id : null,
    customer_name: String(row.customer_name ?? "Cliente"),
    customer_phone:
      typeof row.customer_phone === "string" ? row.customer_phone : null,
    item_id: String(row.item_id),
    product_id:
      typeof row.product_id === "string" ? row.product_id : null,
    variant_id:
      typeof row.variant_id === "string" ? row.variant_id : null,
    flavor_id:
      typeof row.flavor_id === "string" ? row.flavor_id : null,
    item_name: String(row.item_name ?? "Item"),
    variant_label:
      typeof row.variant_label === "string" ? row.variant_label : null,
    quantity_sold: Number(row.quantity_sold ?? 0),
    quantity_returned_or_open: Number(row.quantity_returned_or_open ?? 0),
    quantity_available: Number(row.quantity_available ?? 0),
    unit_cost: Number(row.unit_cost ?? 0),
    unit_price: Number(row.unit_price ?? 0),
  })) satisfies ReturnEligibleItem[];

  return (
    <>
      <PageHeader
        eyebrow={`Pós-venda · ${
          operation === "fitness" ? "Fitness" : "Suplementos"
        }`}
        title="Nova troca, devolução ou garantia"
        description="Abra a ocorrência a partir da venda original para preservar histórico, quantidade e valor."
        action={
          <Link className="button ghost" href="/trocas">
            <ArrowLeft size={16} />
            Central
          </Link>
        }
      />

      <ReturnCaseCreateForm operation={operation} rows={rows} />
    </>
  );
}
