import {
  Coins,
  PackageMinus,
} from "lucide-react";
import {
  CommercialOutflowCancelButton,
  CommercialOutflowForm,
} from "@/components/commercial-outflow-form";
import { CommercialNav } from "@/components/commercial-nav";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import {
  formatCurrency,
  formatDateOnly,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

export default async function CommercialOutflowsPage() {
  const access =
    await getCurrentUserAccess();
  const supabase =
    await createClient();

  const [
    productsResult,
    locationsResult,
    flavorsResult,
    partnersResult,
    stockResult,
    flavorStockResult,
    outflowsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,cost_price,sale_price,flavor_tracking_enabled",
      )
      .eq("active", true)
      .order("name"),

    supabase
      .from("locations")
      .select("id,code,name")
      .eq("active", true)
      .eq(
        "tracks_inventory",
        true,
      )
      .order("code"),

    supabase
      .from("product_flavors")
      .select(
        "id,product_id,name",
      )
      .eq("active", true)
      .order("display_order"),

    supabase
      .from("partners")
      .select(
        "id,name,partner_type",
      )
      .eq("active", true)
      .neq(
        "partner_type",
        "supplier",
      )
      .order("name"),

    supabase
      .from(
        "inventory_location_overview",
      )
      .select(
        "product_id,location_id,available_quantity",
      ),

    supabase
      .from(
        "product_flavor_stock_balances",
      )
      .select(
        "flavor_id,location_id,quantity",
      ),

    supabase
      .from(
        "commercial_outflows_overview",
      )
      .select("*")
      .order("occurred_on", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(80),
  ]);

  for (const result of [
    productsResult,
    locationsResult,
    flavorsResult,
    partnersResult,
    stockResult,
    flavorStockResult,
    outflowsResult,
  ]) {
    if (result.error) {
      throw new Error(
        result.error.message,
      );
    }
  }

  const outflows =
    outflowsResult.data ?? [];

  const completed =
    outflows.filter(
      (row) =>
        row.status ===
        "completed",
    );

  const totalUnits =
    completed.reduce(
      (sum, row) =>
        sum +
        Number(
          row.total_units ?? 0,
        ),
      0,
    );

  const totalCost =
    completed.reduce(
      (sum, row) =>
        sum +
        Number(
          row.total_cost ?? 0,
        ),
      0,
    );

  const partnerActions =
    completed.filter(
      (row) => row.partner_id,
    ).length;

  const canWrite =
    access.role === "admin" ||
    access.canWriteSupplements;

  return (
    <>
      <PageHeader
        eyebrow="Comercial"
        title="Ações comerciais"
        description="Envie brindes, sorteios, amostras e ativações para parceiros. O estoque e o custo são baixados, mas a ação não vira venda e não altera ticket médio."
      />

      <CommercialNav
        active="actions"
      />

      <section className="grid stats-grid crm-stats-grid">
        <StatCard
          href="/suplementos/saidas"
          label="Ações registradas"
          value={String(
            completed.length,
          )}
          note="Saídas comerciais válidas"
          icon={PackageMinus}
        />

        <StatCard
          href="/suplementos/saidas"
          label="Unidades investidas"
          value={String(
            totalUnits,
          )}
          note="Não entram como venda"
          icon={PackageMinus}
        />

        <StatCard
          href="/suplementos/saidas"
          label="Custo comercial"
          value={formatCurrency(
            totalCost,
          )}
          note="Despesa econômica real dos produtos"
          icon={Coins}
        />

        <StatCard
          href="/parceiros/configuracao"
          label="Ações com parceiro"
          value={String(
            partnerActions,
          )}
          note="Mensuráveis por parceria"
          icon={Coins}
        />
      </section>

      {canWrite && (
        <CommercialOutflowForm
          products={
            productsResult.data ??
            []
          }
          locations={
            locationsResult.data ??
            []
          }
          flavors={
            flavorsResult.data ??
            []
          }
          partners={
            partnersResult.data ??
            []
          }
          stockRows={
            stockResult.data ??
            []
          }
          flavorStockRows={
            flavorStockResult.data ??
            []
          }
        />
      )}

      <article className="panel commercial-outflow-history-v45">
        <div className="panel-head">
          <div>
            <h2>
              Histórico de ações
            </h2>
            <p>
              Receita zero; custo,
              estoque e parceria
              continuam rastreáveis.
            </p>
          </div>
          <strong>
            {outflows.length}
          </strong>
        </div>

        <div className="commercial-outflow-history-list-v45">
          {outflows.map(
            (row) => (
              <div
                className={`commercial-outflow-history-row-v45 ${row.status}`}
                key={row.id}
              >
                <div>
                  <strong>
                    {
                      row.destination_name
                    }
                  </strong>

                  <span>
                    {row.reason_label} ·{" "}
                    {formatDateOnly(
                      row.occurred_on,
                    )}
                  </span>

                  <small>
                    {row.product_summary ||
                      "Sem itens"}
                  </small>

                  {row.notes && (
                    <small>
                      {row.notes}
                    </small>
                  )}
                </div>

                <div className="commercial-outflow-history-value-v45">
                  <strong>
                    {formatCurrency(
                      Number(
                        row.total_cost ??
                          0,
                      ),
                    )}
                  </strong>

                  <small>
                    {row.total_units} un.
                    · custo
                  </small>
                </div>

                {row.status ===
                  "completed" &&
                canWrite ? (
                  <CommercialOutflowCancelButton
                    id={row.id}
                  />
                ) : (
                  <span className="badge gray">
                    {row.status ===
                    "cancelled"
                      ? "Estornada"
                      : row.status}
                  </span>
                )}
              </div>
            ),
          )}

          {outflows.length === 0 && (
            <div className="empty compact">
              <PackageMinus
                size={24}
              />
              <strong>
                Nenhuma ação comercial
                registrada
              </strong>
              A primeira pode ser um
              sorteio, amostra, brinde ou
              ativação de parceria.
            </div>
          )}
        </div>
      </article>
    </>
  );
}
