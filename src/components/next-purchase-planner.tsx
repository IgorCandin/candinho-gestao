"use client";

import Link from "next/link";
import {
  Boxes,
  CheckCheck,
  Clipboard,
  PackagePlus,
  Search,
  ShoppingCart,
  Tags,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export type NextPurchasePlanRow = {
  product_id: string;
  product_name: string;
  category: string;
  brand: string | null;
  cost_price: number;
  sale_price: number;
  ideal_stock: number;
  physical_quantity: number;
  incoming_quantity: number;
  supplier_id: string | null;
  supplier_name: string | null;
  sold_90d: number;
  last_sale_at: string | null;
  flavor_tracking_enabled: boolean;
};

function qty(row: NextPurchasePlanRow) {
  return Math.max(
    Math.ceil(row.ideal_stock - row.physical_quantity - row.incoming_quantity),
    0,
  );
}

function totals(rows: NextPurchasePlanRow[], selected: Set<string>) {
  const chosen = rows.filter((row) => selected.has(row.product_id));
  const units = chosen.reduce((sum, row) => sum + qty(row), 0);
  const cost = chosen.reduce(
    (sum, row) => sum + qty(row) * Number(row.cost_price || 0),
    0,
  );
  const sale = chosen.reduce(
    (sum, row) => sum + qty(row) * Number(row.sale_price || 0),
    0,
  );

  return {
    products: chosen.length,
    units,
    cost,
    sale,
    conservativeSale: sale * 0.9,
  };
}

function supplierKey(row: NextPurchasePlanRow) {
  return row.supplier_id ?? "sem-fornecedor";
}

export function NextPurchasePlanner({ rows }: { rows: NextPurchasePlanRow[] }) {
  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(rows.map((row) => row.product_id)),
  );
  const [copyMessage, setCopyMessage] = useState("");

  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(supplierKey(row), row.supplier_name ?? "Sem fornecedor");
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [rows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return rows
      .filter((row) => supplier === "all" || supplierKey(row) === supplier)
      .filter((row) => {
        if (!query) return true;
        return `${row.product_name} ${row.category} ${row.brand ?? ""} ${row.supplier_name ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(query);
      })
      .sort(
        (a, b) =>
          Number(!a.supplier_id) - Number(!b.supplier_id) ||
          (a.supplier_name ?? "").localeCompare(b.supplier_name ?? "", "pt-BR") ||
          b.sold_90d - a.sold_90d ||
          a.product_name.localeCompare(b.product_name, "pt-BR"),
      );
  }, [rows, search, supplier]);

  const allTotals = useMemo(
    () => totals(rows, new Set(rows.map((row) => row.product_id))),
    [rows],
  );
  const selectedTotals = useMemo(() => totals(rows, selected), [rows, selected]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; supplierId: string | null; rows: NextPurchasePlanRow[] }
    >();

    for (const row of filtered) {
      const key = supplierKey(row);
      const current = map.get(key) ?? {
        name: row.supplier_name ?? "Sem fornecedor",
        supplierId: row.supplier_id,
        rows: [],
      };
      current.rows.push(row);
      map.set(key, current);
    }

    return [...map.entries()];
  }, [filtered]);

  function toggle(productId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function markVisible() {
    setSelected((current) => {
      const next = new Set(current);
      filtered.forEach((row) => next.add(row.product_id));
      return next;
    });
  }

  function clearVisible() {
    setSelected((current) => {
      const next = new Set(current);
      filtered.forEach((row) => next.delete(row.product_id));
      return next;
    });
  }

  async function copyPlan() {
    const chosen = rows.filter((row) => selected.has(row.product_id));
    if (!chosen.length) {
      setCopyMessage("Selecione pelo menos um produto.");
      return;
    }

    const grouped = new Map<string, NextPurchasePlanRow[]>();
    for (const row of chosen) {
      const name = row.supplier_name ?? "Sem fornecedor";
      grouped.set(name, [...(grouped.get(name) ?? []), row]);
    }

    const lines = ["PLANEJAR PRÓXIMO PEDIDO", ""];
    for (const [name, items] of grouped) {
      lines.push(name);
      items.forEach((row) => {
        lines.push(
          `• ${row.product_name} — ${qty(row)} un. — ${formatCurrency(qty(row) * row.cost_price)}`,
        );
      });
      lines.push("");
    }

    lines.push(
      `Selecionados: ${selectedTotals.products} produtos / ${selectedTotals.units} unidades`,
      `Custo estimado: ${formatCurrency(selectedTotals.cost)}`,
      `Venda potencial: ${formatCurrency(selectedTotals.sale)}`,
      `Venda provável (-10%): ${formatCurrency(selectedTotals.conservativeSale)}`,
    );

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("Lista copiada.");
    } catch {
      setCopyMessage("Não foi possível copiar automaticamente.");
    }
  }

  return (
    <>
      <section className="next-order-summary">
        <article>
          <span>Zerados para repor</span>
          <strong>{allTotals.products}</strong>
          <small>físico 0 · ideal maior que 0</small>
        </article>
        <article>
          <span>Unidades até o ideal</span>
          <strong>{allTotals.units}</strong>
          <small>sem contar itens já a caminho</small>
        </article>
        <article>
          <span>Custo estimado</span>
          <strong>{formatCurrency(allTotals.cost)}</strong>
          <small>usando o custo cadastrado</small>
        </article>
        <article>
          <span>Venda provável</span>
          <strong>{formatCurrency(allTotals.conservativeSale)}</strong>
          <small>cenário conservador de venda -10%</small>
        </article>
      </section>

      <article className="panel next-order-rule">
        <div className="panel-body">
          <Boxes size={20} />
          <div>
            <strong>O que entra nesta lista?</strong>
            <p>
              Produto com <b>Estoque ideal &gt; 0</b>, estoque físico zerado e
              nenhuma unidade a caminho. Produto com estoque ideal 0 fica fora.
            </p>
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Planejar próximo pedido</h2>
            <p>Marque o que realmente quer comprar e veja o investimento antes de abrir o pedido.</p>
          </div>
          <PackagePlus size={20} />
        </div>

        <div className="panel-body next-order-toolbar">
          <label className="next-order-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto, marca ou fornecedor"
            />
          </label>

          <select
            className="select"
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          >
            <option value="all">Todos os fornecedores</option>
            {suppliers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <button className="button ghost compact-button" type="button" onClick={markVisible}>
            <CheckCheck size={14} />
            Marcar visíveis
          </button>
          <button className="button ghost compact-button" type="button" onClick={clearVisible}>
            <X size={14} />
            Limpar visíveis
          </button>
        </div>
      </article>

      {rows.length === 0 ? (
        <article className="panel">
          <div className="empty">
            <strong>Nenhum produto zerado precisando reposição</strong>
            Não há item com ideal maior que zero, físico zerado e sem reposição a caminho.
          </div>
        </article>
      ) : filtered.length === 0 ? (
        <article className="panel">
          <div className="empty">
            <strong>Nenhum item neste filtro</strong>
            Altere a busca ou o fornecedor.
          </div>
        </article>
      ) : (
        <div className="next-order-groups">
          {groups.map(([key, group]) => {
            const groupSelected = group.rows.filter((row) => selected.has(row.product_id));
            const groupCost = groupSelected.reduce(
              (sum, row) => sum + qty(row) * row.cost_price,
              0,
            );

            return (
              <article className="panel next-order-supplier" key={key}>
                <div className="panel-head">
                  <div>
                    <h2>{group.name}</h2>
                    <p>
                      {groupSelected.length} de {group.rows.length} produto(s) selecionado(s) · {formatCurrency(groupCost)}
                    </p>
                  </div>

                  {group.supplierId ? (
                    <Link className="button ghost compact-button" href="/pedidos-fornecedor/novo">
                      <ShoppingCart size={15} />
                      Abrir novo pedido
                    </Link>
                  ) : (
                    <Link className="button ghost compact-button" href="/fornecedores">
                      Cadastrar fornecedor
                    </Link>
                  )}
                </div>

                <div className="panel-body next-order-list">
                  {group.rows.map((row) => {
                    const quantity = qty(row);
                    const isSelected = selected.has(row.product_id);

                    return (
                      <label
                        className={`next-order-row ${isSelected ? "selected" : ""}`}
                        key={row.product_id}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(row.product_id)}
                        />

                        <div className="next-order-product">
                          <strong>{row.product_name}</strong>
                          <small>{[row.category, row.brand].filter(Boolean).join(" · ")}</small>
                          <div className="next-order-badges">
                            {row.flavor_tracking_enabled && (
                              <span className="badge blue">
                                <Tags size={11} />
                                Escolher sabores no pedido
                              </span>
                            )}
                            {row.sold_90d > 0 && (
                              <span className="badge">Giro 90d: {row.sold_90d} un.</span>
                            )}
                          </div>
                        </div>

                        <div className="next-order-metrics">
                          <span>Físico<b>{row.physical_quantity}</b></span>
                          <span>A caminho<b>{row.incoming_quantity}</b></span>
                          <span>Ideal<b>{row.ideal_stock}</b></span>
                          <span className="next-order-buy">Comprar<b>{quantity}</b></span>
                        </div>

                        <div className="next-order-values">
                          <strong>{formatCurrency(quantity * row.cost_price)}</strong>
                          <small>{formatCurrency(row.cost_price)} / un.</small>
                          {row.last_sale_at && (
                            <small>Última venda: {formatDateOnly(row.last_sale_at)}</small>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="next-order-selection-bar">
        <div>
          <span>Planejamento selecionado</span>
          <strong>{selectedTotals.products} produtos · {selectedTotals.units} un.</strong>
        </div>
        <div>
          <span>Investimento</span>
          <strong>{formatCurrency(selectedTotals.cost)}</strong>
        </div>
        <div className="next-order-selection-desktop">
          <span>Venda potencial</span>
          <strong>{formatCurrency(selectedTotals.sale)}</strong>
        </div>
        <div className="next-order-selection-desktop">
          <span>Provável -10%</span>
          <strong>{formatCurrency(selectedTotals.conservativeSale)}</strong>
        </div>
        <button
          className="button gold"
          type="button"
          onClick={copyPlan}
          disabled={selectedTotals.products === 0}
        >
          <Clipboard size={15} />
          Copiar lista
        </button>
      </div>

      {copyMessage && <p className="next-order-copy-message">{copyMessage}</p>}

      <article className="panel next-order-footer-note">
        <div className="panel-body">
          <Truck size={18} />
          <p>
            Esta tela não cria estoque nem pedido automaticamente. Depois de fechar o que vai comprar,
            abra o pedido do fornecedor e escolha sabores, quantidades finais e custos reais.
          </p>
        </div>
      </article>
    </>
  );
}
