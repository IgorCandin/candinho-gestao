import { PageHeader } from "@/components/page-header";
import { LabelPrintCenter, type LabelCatalogItem } from "@/components/label-print-center";
import { getFitnessStock } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyLabelsPage() {
  const supabase = await createClient();
  const [supplementsResult, fitness] = await Promise.all([
    supabase.from("products").select("id,name,internal_code,barcode_value,sale_price,installment_price,active").eq("active", true).order("name"),
    getFitnessStock(),
  ]);
  if (supplementsResult.error) throw supplementsResult.error;
  const supplements: LabelCatalogItem[] = (supplementsResult.data ?? []).map((row) => ({ id: `supp-${row.id}`, operation: "Suplementos", name: String(row.name), internalCode: typeof row.internal_code === "string" ? row.internal_code : null, barcodeValue: typeof row.barcode_value === "string" ? row.barcode_value : null, cashPrice: Number(row.sale_price ?? 0), installmentPrice: Number(row.installment_price ?? row.sale_price ?? 0), search: `${row.name} ${row.internal_code ?? ""} ${row.barcode_value ?? ""}` }));
  const fitnessItems: LabelCatalogItem[] = fitness.filter((row) => row.product_active && row.variant_active).map((row) => ({ id: `fitness-${row.variant_id}`, operation: "Fitness", name: row.product_name, internalCode: row.internal_code, barcodeValue: row.barcode_value, cashPrice: row.sale_price, installmentPrice: row.sale_price, size: row.size, color: row.color, search: `${row.product_name} ${row.size} ${row.color} ${row.sku ?? ""} ${row.internal_code ?? ""} ${row.barcode_value ?? ""}` }));
  return <><PageHeader eyebrow="Company · Gestão" title="Imprimir etiquetas" description="Gere etiquetas da Candinho em preto e branco para códigos, preços e variações."/><LabelPrintCenter items={[...supplements, ...fitnessItems]}/></>;
}
