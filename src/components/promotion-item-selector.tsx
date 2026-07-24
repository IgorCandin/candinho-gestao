"use client";

import { Check, ImageIcon, PackageSearch, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { PromotionProductOption } from "@/lib/promotion-data";

type Props = {
  operationScope: "supplements" | "fitness" | "both";
  supplementOptions: PromotionProductOption[];
  fitnessOptions: PromotionProductOption[];
  action: (formData: FormData) => void | Promise<void>;
  promotionId: string;
  existingSupplementIds?: string[];
  existingFitnessIds?: string[];
};

type OperationFilter = "all" | "supplements" | "fitness";

type SelectableItem = PromotionProductOption & {
  operation: "supplements" | "fitness";
};

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PromotionItemSelector({
  operationScope,
  supplementOptions,
  fitnessOptions,
  action,
  promotionId,
  existingSupplementIds = [],
  existingFitnessIds = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState<OperationFilter>(
    operationScope === "both" ? "all" : operationScope,
  );
  const [stockOnly, setStockOnly] = useState(false);
  const [category, setCategory] = useState("all");
  const [selectedSupplements, setSelectedSupplements] = useState<Set<string>>(new Set());
  const [selectedFitness, setSelectedFitness] = useState<Set<string>>(new Set());

  const existingSupplements = useMemo(() => new Set(existingSupplementIds), [existingSupplementIds]);
  const existingFitness = useMemo(() => new Set(existingFitnessIds), [existingFitnessIds]);

  const allItems = useMemo<SelectableItem[]>(
    () => [
      ...supplementOptions.map((item) => ({ ...item, operation: "supplements" as const })),
      ...fitnessOptions.map((item) => ({ ...item, operation: "fitness" as const })),
    ],
    [fitnessOptions, supplementOptions],
  );

  const categories = useMemo(
    () => [...new Set(allItems.map((item) => item.category).filter(Boolean))].sort(),
    [allItems],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");

    return allItems.filter((item) => {
      if (operationFilter !== "all" && item.operation !== operationFilter) return false;
      if (stockOnly && item.availableQuantity <= 0) return false;
      if (category !== "all" && item.category !== category) return false;

      if (!query) return true;

      return `${item.label} ${item.meta} ${item.category}`
        .toLocaleLowerCase("pt-BR")
        .includes(query);
    });
  }, [allItems, category, operationFilter, search, stockOnly]);

  function isExisting(item: SelectableItem) {
    return item.operation === "supplements"
      ? existingSupplements.has(item.id)
      : existingFitness.has(item.id);
  }

  function isSelected(item: SelectableItem) {
    return item.operation === "supplements"
      ? selectedSupplements.has(item.id)
      : selectedFitness.has(item.id);
  }

  function toggle(item: SelectableItem) {
    if (isExisting(item)) return;

    const setter =
      item.operation === "supplements"
        ? setSelectedSupplements
        : setSelectedFitness;

    setter((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function selectVisible() {
    const supplements = visible
      .filter((item) => item.operation === "supplements" && !isExisting(item))
      .map((item) => item.id);

    const fitness = visible
      .filter((item) => item.operation === "fitness" && !isExisting(item))
      .map((item) => item.id);

    setSelectedSupplements((current) => new Set([...current, ...supplements]));
    setSelectedFitness((current) => new Set([...current, ...fitness]));
  }

  function clearSelection() {
    setSelectedSupplements(new Set());
    setSelectedFitness(new Set());
  }

  const totalSelected = selectedSupplements.size + selectedFitness.size;

  return (
    <form action={action} className="promotion-ux-selector">
      <input type="hidden" name="promotion_id" value={promotionId} />

      {[...selectedSupplements].map((id) => (
        <input key={`supp-${id}`} type="hidden" name="supplementProductIds" value={id} />
      ))}

      {[...selectedFitness].map((id) => (
        <input key={`fit-${id}`} type="hidden" name="fitnessVariantIds" value={id} />
      ))}

      <div className="promotion-ux-selector-toolbar">
        <div className="promotion-ux-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar produto, categoria, tamanho ou cor..."
          />
        </div>

        {operationScope === "both" && (
          <div className="promotion-ux-segmented">
            {[
              ["all", "Todos"],
              ["supplements", "Suplementos"],
              ["fitness", "Fitness"],
            ].map(([value, label]) => (
              <button
                className={operationFilter === value ? "active" : ""}
                key={value}
                onClick={() => setOperationFilter(value as OperationFilter)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((item) => (
            <option value={item} key={item}>{item}</option>
          ))}
        </select>

        <label className="promotion-ux-stock-toggle">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(event) => setStockOnly(event.target.checked)}
          />
          Só com estoque
        </label>
      </div>

      <div className="promotion-ux-selector-actions">
        <span>
          <b>{visible.length}</b> produto(s) visível(is)
        </span>
        <div>
          <button className="button ghost compact-button" type="button" onClick={selectVisible}>
            Selecionar visíveis
          </button>
          {totalSelected > 0 && (
            <button className="button ghost compact-button" type="button" onClick={clearSelection}>
              <X size={14} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="promotion-ux-empty">
          <PackageSearch size={26} />
          <strong>Nenhum produto encontrado</strong>
          <span>Ajuste a busca ou os filtros.</span>
        </div>
      ) : (
        <div className="promotion-ux-product-grid">
          {visible.map((item) => {
            const existing = isExisting(item);
            const selected = isSelected(item);

            return (
              <button
                className={`promotion-ux-product-card ${selected ? "selected" : ""} ${existing ? "existing" : ""}`}
                disabled={existing}
                key={`${item.operation}-${item.id}`}
                onClick={() => toggle(item)}
                type="button"
              >
                <div className="promotion-ux-product-image">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.label} />
                  ) : (
                    <ImageIcon size={24} />
                  )}

                  <span className={item.availableQuantity > 0 ? "stock-ok" : "stock-zero"}>
                    {item.availableQuantity} em estoque
                  </span>
                </div>

                <div className="promotion-ux-product-copy">
                  <small>{item.operation === "supplements" ? "Suplementos" : "Fitness"} · {item.category}</small>
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>

                  <footer>
                    <b>{money(item.currentPrice)}</b>
                    <i className={selected || existing ? "checked" : ""}>
                      {existing ? "Já adicionado" : selected ? <><Check size={12} /> Selecionado</> : "Selecionar"}
                    </i>
                  </footer>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="promotion-ux-selection-bar">
        <div>
          <strong>{totalSelected} produto(s) selecionado(s)</strong>
          <span>Depois de adicionar, configure preço, desconto e limite somente dos itens escolhidos.</span>
        </div>

        <button className="button gold" type="submit" disabled={totalSelected === 0}>
          Adicionar à promoção
        </button>
      </div>
    </form>
  );
}
