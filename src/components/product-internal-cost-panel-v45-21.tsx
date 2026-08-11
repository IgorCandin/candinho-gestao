import { CircleDollarSign, History, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function ProductInternalCostPanelV4521({
  productId,
  salePrice,
}: {
  productId: string;
  salePrice: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("cost_price,last_purchase_cost,last_purchase_on,cost_method")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const currentCost = Number(data.cost_price ?? 0);
  const lastCost =
    data.last_purchase_cost === null
      ? null
      : Number(data.last_purchase_cost);
  const margin = Math.max(Number(salePrice ?? 0) - currentCost, 0);
  const difference =
    lastCost && lastCost > 0 ? currentCost - lastCost : null;

  return (
    <article className="panel v4521-product-cost-panel">
      <div className="panel-head">
        <div>
          <h2>Custos internos</h2>
          <p>
            Referência gerencial para compra. Esta informação não aparece na
            vitrine pública.
          </p>
        </div>
        <CircleDollarSign size={19} />
      </div>

      <div className="panel-body v4521-cost-grid">
        <div>
          <span>Custo cadastrado</span>
          <strong>{formatCurrency(currentCost)}</strong>
          <small>{data.cost_method || "Custo atual"}</small>
        </div>

        <div>
          <span>Último custo de compra</span>
          <strong>
            {lastCost && lastCost > 0
              ? formatCurrency(lastCost)
              : "Sem histórico"}
          </strong>
          <small>
            {data.last_purchase_on
              ? formatDateOnly(String(data.last_purchase_on))
              : "Ainda sem pedido histórico utilizável"}
          </small>
        </div>

        <div>
          <span>Diferença vs. última compra</span>
          <strong
            className={
              difference === null
                ? ""
                : difference > 0
                  ? "warning-text"
                  : "positive"
            }
          >
            {difference === null
              ? "—"
              : `${difference > 0 ? "+" : ""}${formatCurrency(difference)}`}
          </strong>
          <small>
            {difference === null ? (
              "Aparece após existir histórico"
            ) : difference > 0 ? (
              <>
                <TrendingUp size={13} /> custo atual acima do último
              </>
            ) : (
              <>
                <TrendingDown size={13} /> custo atual igual ou melhor
              </>
            )}
          </small>
        </div>

        <div>
          <span>Margem bruta no preço atual</span>
          <strong>{formatCurrency(margin)}</strong>
          <small>Preço de venda menos custo cadastrado</small>
        </div>
      </div>
    </article>
  );
}
