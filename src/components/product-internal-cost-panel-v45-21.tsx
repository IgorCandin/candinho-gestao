import {
  CircleDollarSign,
  History,
  Layers3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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

  const [productResult, lotsResult, summaryResult] = await Promise.all([
    supabase
      .from("products")
      .select("cost_price,last_purchase_cost,last_purchase_on,cost_method")
      .eq("id", productId)
      .maybeSingle(),
    supabase
      .from("inventory_lots")
      .select("quantity_on_hand,unit_cost")
      .eq("product_id", productId)
      .gt("quantity_on_hand", 0),
    supabase
      .from("product_management_details")
      .select("physical_quantity")
      .eq("id", productId)
      .maybeSingle(),
  ]);

  if (productResult.error) throw productResult.error;
  if (lotsResult.error) throw lotsResult.error;
  if (summaryResult.error) throw summaryResult.error;
  if (!productResult.data) return null;

  const data = productResult.data;
  const referenceCost = Number(data.cost_price ?? 0);
  const lastCost =
    data.last_purchase_cost === null
      ? null
      : Number(data.last_purchase_cost);
  const physicalQuantity = Number(summaryResult.data?.physical_quantity ?? 0);

  const tracked = (lotsResult.data ?? []).reduce(
    (accumulator, row) => {
      const quantity = Number(row.quantity_on_hand ?? 0);
      const unitCost = Number(row.unit_cost ?? referenceCost);
      return {
        quantity: accumulator.quantity + quantity,
        cost: accumulator.cost + quantity * unitCost,
      };
    },
    { quantity: 0, cost: 0 },
  );

  const untrackedQuantity = Math.max(physicalQuantity - tracked.quantity, 0);
  const inventoryCostTotal =
    tracked.cost + untrackedQuantity * referenceCost;
  const inventoryAverageCost =
    physicalQuantity > 0
      ? inventoryCostTotal / physicalQuantity
      : referenceCost;

  const marginByReference = Math.max(Number(salePrice ?? 0) - referenceCost, 0);
  const marginByInventory = Math.max(
    Number(salePrice ?? 0) - inventoryAverageCost,
    0,
  );
  const difference =
    lastCost !== null && lastCost > 0
      ? lastCost - referenceCost
      : null;

  return (
    <article className="panel v4521-product-cost-panel">
      <div className="panel-head">
        <div>
          <h2>Custos internos</h2>
          <p>
            O cadastro guarda a referência. Cada entrada mantém o custo real
            daquele lote e a venda usa as unidades efetivamente baixadas.
          </p>
        </div>
        <CircleDollarSign size={19} />
      </div>

      <div className="panel-body v4521-cost-grid">
        <div>
          <span>Custo de referência</span>
          <strong>{formatCurrency(referenceCost)}</strong>
          <small>Fixo no cadastro · não muda quando chega promoção</small>
        </div>

        <div>
          <span>Último custo de compra</span>
          <strong>
            {lastCost !== null
              ? formatCurrency(lastCost)
              : "Sem histórico"}
          </strong>
          <small>
            {data.last_purchase_on
              ? formatDateOnly(String(data.last_purchase_on))
              : "Ainda sem recebimento histórico"}
          </small>
        </div>

        <div>
          <span>Custo real do estoque atual</span>
          <strong>{formatCurrency(inventoryAverageCost)}</strong>
          <small>
            <Layers3 size={13} /> {physicalQuantity} un. · média das camadas
            reais ainda em estoque
          </small>
        </div>

        <div>
          <span>Última compra vs. referência</span>
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
              <><History size={13} /> aparece após existir histórico</>
            ) : difference > 0 ? (
              <><TrendingUp size={13} /> compra acima da referência</>
            ) : (
              <><TrendingDown size={13} /> compra abaixo da referência</>
            )}
          </small>
        </div>

        <div>
          <span>Margem bruta pela referência</span>
          <strong>{formatCurrency(marginByReference)}</strong>
          <small>Preço atual menos custo de referência</small>
        </div>

        <div>
          <span>Margem estimada pelo estoque</span>
          <strong>{formatCurrency(marginByInventory)}</strong>
          <small>Usa o custo médio real das unidades disponíveis agora</small>
        </div>
      </div>
    </article>
  );
}
