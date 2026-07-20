"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PackageSearch, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export type ReturnEligibleItem = {
  operation: "supplements" | "fitness";
  sale_id: string;
  sale_on: string;
  delivered_on: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  item_id: string;
  product_id: string | null;
  variant_id: string | null;
  flavor_id: string | null;
  item_name: string;
  variant_label: string | null;
  quantity_sold: number;
  quantity_returned_or_open: number;
  quantity_available: number;
  unit_cost: number;
  unit_price: number;
};

function todayBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ReturnCaseCreateForm({
  operation,
  rows,
}: {
  operation: "supplements" | "fitness";
  rows: ReturnEligibleItem[];
}) {
  const router = useRouter();

  const sales = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        customer_name: string;
        customer_phone: string | null;
        sale_on: string;
        delivered_on: string | null;
        items: ReturnEligibleItem[];
      }
    >();

    for (const row of rows) {
      const existing = map.get(row.sale_id);

      if (existing) {
        existing.items.push(row);
      } else {
        map.set(row.sale_id, {
          id: row.sale_id,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          sale_on: row.sale_on,
          delivered_on: row.delivered_on,
          items: [row],
        });
      }
    }

    return Array.from(map.values());
  }, [rows]);

  const [saleId, setSaleId] = useState(sales[0]?.id ?? "");
  const [caseType, setCaseType] = useState("exchange");
  const [reason, setReason] = useState("");
  const [requestedOn, setRequestedOn] = useState(todayBrazil());
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedSale = sales.find((sale) => sale.id === saleId);

  function changeQuantity(itemId: string, value: number, max: number) {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(0, Math.min(value, max)),
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const selectedItems = (selectedSale?.items ?? [])
      .map((item) => ({
        item_id: item.item_id,
        quantity: quantities[item.item_id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    if (!saleId) {
      setMessage("Selecione uma venda.");
      return;
    }

    if (selectedItems.length === 0) {
      setMessage("Selecione pelo menos uma unidade.");
      return;
    }

    if (!reason.trim()) {
      setMessage("Informe o motivo da ocorrência.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_return_case", {
        p_operation: operation,
        p_sale_id: saleId,
        p_case_type: caseType,
        p_reason: reason.trim(),
        p_requested_on: requestedOn,
        p_items: selectedItems,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      router.push(`/trocas/${String(data)}`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a ocorrência.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (sales.length === 0) {
    return (
      <article className="panel">
        <div className="empty">
          <PackageSearch size={28} />
          <strong>Nenhuma venda entregue disponível</strong>
          A central só abre troca ou devolução sobre uma venda já entregue e
          com unidades ainda disponíveis para retorno.
        </div>
      </article>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-head">
        <div>
          <h2>Origem da ocorrência</h2>
          <p>
            Escolha a venda original. O sistema impede devolver mais unidades
            do que foram vendidas.
          </p>
        </div>

        <RotateCcw size={20} />
      </div>

      <div className="panel-body form-grid-two">
        <label className="field field-span-two">
          <span>Venda / cliente</span>

          <select
            className="select"
            value={saleId}
            onChange={(event) => {
              setSaleId(event.target.value);
              setQuantities({});
            }}
          >
            {sales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                {sale.customer_name} · {formatDateOnly(sale.sale_on)}
              </option>
            ))}
          </select>

          {selectedSale && (
            <small>
              {selectedSale.customer_phone ?? "Sem telefone"} · entregue{" "}
              {selectedSale.delivered_on
                ? formatDateOnly(selectedSale.delivered_on)
                : "sem data"}
            </small>
          )}
        </label>

        <label className="field">
          <span>Tipo</span>

          <select
            className="select"
            value={caseType}
            onChange={(event) => setCaseType(event.target.value)}
          >
            <option value="exchange">Troca</option>
            <option value="return">Devolução</option>
            <option value="warranty">Garantia / defeito</option>
            <option value="wrong_item">Item incorreto</option>
            <option value="damage">Avaria</option>
            <option value="other">Outro</option>
          </select>
        </label>

        <label className="field">
          <span>Data da solicitação</span>

          <input
            className="input"
            type="date"
            required
            value={requestedOn}
            onChange={(event) => setRequestedOn(event.target.value)}
          />
        </label>

        <label className="field field-span-two">
          <span>Motivo</span>

          <input
            className="input"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: tamanho não serviu, produto veio avariado..."
          />
        </label>
      </div>

      <div className="panel-head">
        <div>
          <h2>Itens envolvidos</h2>
          <p>Marque somente o que realmente faz parte desta ocorrência.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Preço</th>
              <th>Vendido</th>
              <th>Já em ocorrência</th>
              <th>Disponível</th>
              <th>Qtd. desta ocorrência</th>
            </tr>
          </thead>

          <tbody>
            {(selectedSale?.items ?? []).map((item) => (
              <tr key={item.item_id}>
                <td>
                  <strong>{item.item_name}</strong>
                  <small>{item.variant_label ?? ""}</small>
                </td>

                <td>{formatCurrency(item.unit_price)}</td>
                <td>{item.quantity_sold}</td>
                <td>{item.quantity_returned_or_open}</td>
                <td className="positive">{item.quantity_available}</td>

                <td>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max={item.quantity_available}
                    value={quantities[item.item_id] ?? 0}
                    onChange={(event) =>
                      changeQuantity(
                        item.item_id,
                        Number(event.target.value),
                        item.quantity_available,
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel-body form-grid-two">
        <label className="field field-span-two">
          <span>Observação</span>

          <textarea
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Detalhes adicionais do atendimento"
          />
        </label>

        <div className="field field-span-two">
          <button className="button gold" type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <RotateCcw size={16} />
            )}

            {loading ? "Criando" : "Criar ocorrência"}
          </button>

          {message && <small className="form-message">{message}</small>}
        </div>
      </div>
    </form>
  );
}
