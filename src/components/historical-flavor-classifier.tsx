"use client";

import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateOnly } from "@/lib/format";

type PendingRow = {
  sale_item_id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  allocated_quantity: number;
  pending_quantity: number;
  allocation_summary: string | null;
  customer_name: string;
  sale_date: string;
};

type Flavor = {
  id: string;
  product_id: string;
  name: string;
};

export function HistoricalFlavorClassifier({ rows, flavors }: { rows: PendingRow[]; flavors: Flavor[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});

  const flavorsByProduct = useMemo(() => {
    const map = new Map<string, Flavor[]>();
    for (const flavor of flavors) {
      const current = map.get(flavor.product_id) ?? [];
      current.push(flavor);
      map.set(flavor.product_id, current);
    }
    return map;
  }, [flavors]);

  function key(saleItemId: string, flavorId: string) {
    return `${saleItemId}:${flavorId}`;
  }

  function valueFor(saleItemId: string, flavorId: string) {
    return Number(values[key(saleItemId, flavorId)] ?? 0) || 0;
  }

  function allocatedFor(row: PendingRow) {
    return (flavorsByProduct.get(row.product_id) ?? []).reduce(
      (sum, flavor) => sum + valueFor(row.sale_item_id, flavor.id),
      0,
    );
  }

  async function save(row: PendingRow) {
    const productFlavors = flavorsByProduct.get(row.product_id) ?? [];
    const allocated = allocatedFor(row);

    if (allocated !== row.quantity) {
      setMessage((current) => ({
        ...current,
        [row.sale_item_id]: `A classificação precisa somar ${row.quantity}. Informado: ${allocated}.`,
      }));
      return;
    }

    const allocations = productFlavors
      .map((flavor) => ({
        flavor_id: flavor.id,
        quantity: valueFor(row.sale_item_id, flavor.id),
      }))
      .filter((allocation) => allocation.quantity > 0);

    setLoadingId(row.sale_item_id);
    setMessage((current) => ({ ...current, [row.sale_item_id]: "" }));

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("classify_historical_sale_item_flavors", {
        p_sale_item_id: row.sale_item_id,
        p_allocations: allocations,
      });

      if (error) throw error;

      setMessage((current) => ({
        ...current,
        [row.sale_item_id]: "Histórico classificado com sucesso.",
      }));
      router.refresh();
    } catch (error) {
      setMessage((current) => ({
        ...current,
        [row.sale_item_id]: error instanceof Error ? error.message : "Não foi possível classificar a venda.",
      }));
    } finally {
      setLoadingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <article className="panel">
        <div className="empty">
          <CheckCircle2 size={28} />
          <strong>Histórico em dia</strong>
          Nenhuma venda antiga deste filtro está aguardando classificação de sabor.
        </div>
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {rows.map((row) => {
        const productFlavors = flavorsByProduct.get(row.product_id) ?? [];
        const allocated = allocatedFor(row);
        const complete = allocated === row.quantity;

        return (
          <article className="panel" key={row.sale_item_id}>
            <div className="panel-head">
              <div>
                <h2>{row.product_name}</h2>
                <p>{formatDateOnly(row.sale_date)} · {row.customer_name} · venda com {row.quantity} unidade(s)</p>
              </div>
              <span className={`badge ${complete ? "green" : "orange"}`}>
                <span className="dot" />
                {allocated}/{row.quantity} classificado
              </span>
            </div>

            <div className="panel-body">
              {row.allocation_summary && (
                <p className="form-help"><strong>Classificação já salva:</strong> {row.allocation_summary}</p>
              )}

              <div className="form-grid-three">
                {productFlavors.map((flavor) => (
                  <label className="field" key={flavor.id}>
                    <span>{flavor.name}</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max={row.quantity}
                      step="1"
                      value={values[key(row.sale_item_id, flavor.id)] ?? "0"}
                      onChange={(event) => setValues((current) => ({
                        ...current,
                        [key(row.sale_item_id, flavor.id)]: event.target.value,
                      }))}
                    />
                  </label>
                ))}
              </div>

              <div className="sale-stock-strip">
                <span>Total da venda <strong>{row.quantity}</strong></span>
                <span>Classificado agora <strong className={complete ? "positive" : "warning-text"}>{allocated}</strong></span>
                <span>Falta classificar <strong>{Math.max(row.quantity - allocated, 0)}</strong></span>
              </div>

              {message[row.sale_item_id] && <p className="form-message">{message[row.sale_item_id]}</p>}

              <div className="panel-actions">
                <button
                  className="button gold"
                  type="button"
                  disabled={loadingId === row.sale_item_id || !complete || productFlavors.length === 0}
                  onClick={() => save(row)}
                >
                  {loadingId === row.sale_item_id ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                  Salvar classificação
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
