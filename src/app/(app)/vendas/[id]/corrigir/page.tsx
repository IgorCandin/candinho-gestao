import Link from "next/link";
import { ArrowLeft, FileText, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/demo-banner";
import {
  SaleCorrectionForm,
  type SaleCorrectionFlavor,
  type SaleCorrectionProduct,
} from "@/components/sale-correction-form";
import { PageHeader } from "@/components/page-header";
import { getSaleDetails, getSaleStockOptions } from "@/lib/data";
import {
  getActivePromotionRows,
  getSupplementPromotion,
} from "@/lib/active-promotion-data";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function CorrectSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [sale, baseStock, promotionRows] = await Promise.all([
    getSaleDetails(id),
    getSaleStockOptions(),
    getActivePromotionRows(),
  ]);

  if (!sale) notFound();

  const supabase = await createClient();

  const [paymentResult, flavorResult] = await Promise.all([
    supabase
      .from("sale_payment_summary")
      .select("received_amount,outstanding_amount,installment_count,payment_state")
      .eq("sale_id", id)
      .maybeSingle(),

    supabase
      .from("product_flavors")
      .select("id,product_id,name")
      .eq("active", true)
      .order("name"),
  ]);

  if (paymentResult.error) throw paymentResult.error;
  if (flavorResult.error) throw flavorResult.error;

  const receivedAmount = Number(paymentResult.data?.received_amount ?? 0);
  const installmentCount = Number(paymentResult.data?.installment_count ?? 0);

  const eligible =
    sale.general_status !== "cancelled" &&
    ["active", "finalized"].includes(sale.general_status) &&
    sale.payment_status !== "received" &&
    receivedAmount <= 0.005 &&
    installmentCount === 0;

  const locationStock = baseStock
    .filter((row) => row.location_id === sale.location_id)
    .map((row): SaleCorrectionProduct => {
      const promotion = getSupplementPromotion(row.product_id, promotionRows);

      return {
        productId: row.product_id,
        name: row.product_name,
        category: row.category,
        brand: row.brand,
        imageUrl: row.image_url,
        costPrice: row.cost_price,
        regularPrice: row.sale_price,
        effectivePrice:
          promotion?.effective_promotional_price ?? row.sale_price,
        availableQuantity: row.available_quantity,
        promotionName: promotion?.promotion_name ?? null,
        promotionDiscountPct: promotion?.effective_discount_pct ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const flavors: SaleCorrectionFlavor[] = (flavorResult.data ?? []).map(
    (row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      name: String(row.name ?? "Sabor"),
    }),
  );

  return (
    <>
      <DemoBanner />

      <PageHeader
        eyebrow="Venda · Correção"
        title={`Corrigir venda · ${sale.customer_name}`}
        description="Inclua um produto que ficou de fora sem cancelar a venda original. O sistema recalcula venda, estoque, saldo a receber e o PDF do orçamento."
        action={
          <div className="page-header-actions">
            {sale.quote_id && (
              <a
                className="button ghost"
                href={`/api/orcamentos/${sale.quote_id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <FileText size={16} />
                PDF atual
              </a>
            )}

            <Link className="button ghost" href={`/vendas/${sale.id}`}>
              <ArrowLeft size={16} />
              Voltar
            </Link>
          </div>
        }
      />

      {!eligible ? (
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Correção protegida</h2>
              <p>Esta venda não pode receber novos itens automaticamente neste momento.</p>
            </div>
            <LockKeyhole size={20} />
          </div>

          <div className="panel-body sale-detail-list">
            {sale.general_status === "cancelled" && (
              <div className="sale-detail-line">
                <span>Motivo</span>
                <strong>A venda está cancelada.</strong>
              </div>
            )}

            {(sale.payment_status === "received" || receivedAmount > 0.005) && (
              <>
                <div className="sale-detail-line">
                  <span>Motivo</span>
                  <strong>Já existe pagamento recebido nesta venda.</strong>
                </div>
                <div className="sale-detail-line">
                  <span>Recebido</span>
                  <strong>{formatCurrency(receivedAmount)}</strong>
                </div>
              </>
            )}

            {installmentCount > 0 && (
              <div className="sale-detail-line">
                <span>Motivo</span>
                <strong>
                  Existe um plano com {installmentCount} parcela(s). Alterar o total exigiria recalcular as parcelas.
                </strong>
              </div>
            )}

            <p className="sale-notes">
              A proteção evita alterar estoque e financeiro depois que dinheiro já entrou ou quando existe parcelamento planejado.
            </p>
          </div>
        </article>
      ) : (
        <SaleCorrectionForm
          saleId={sale.id}
          customerName={sale.customer_name}
          currentTotal={sale.total_amount}
          locationLabel={`${sale.location_code} · ${sale.location_name}`}
          deliveryStatus={sale.delivery_status}
          quoteId={sale.quote_id}
          products={locationStock}
          flavors={flavors}
        />
      )}
    </>
  );
}
