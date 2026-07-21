"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PromotionProductOption } from "@/lib/promotion-data";

type Props = {
  operationScope: "supplements" | "fitness" | "both";
  supplementOptions: PromotionProductOption[];
  fitnessOptions: PromotionProductOption[];
  action: (formData: FormData) => void | Promise<void>;
  promotionId: string;
};

function filteredOptions(options: PromotionProductOption[], search: string) {
  const query = search.trim().toLocaleLowerCase("pt-BR");
  if (!query) return options;

  return options.filter((item) =>
    `${item.label} ${item.meta}`
      .toLocaleLowerCase("pt-BR")
      .includes(query),
  );
}

export function PromotionItemSelector({
  operationScope,
  supplementOptions,
  fitnessOptions,
  action,
  promotionId,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedSupplements, setSelectedSupplements] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFitness, setSelectedFitness] = useState<Set<string>>(new Set());

  const visibleSupplements = useMemo(
    () => filteredOptions(supplementOptions, search),
    [supplementOptions, search],
  );

  const visibleFitness = useMemo(
    () => filteredOptions(fitnessOptions, search),
    [fitnessOptions, search],
  );

  function toggle(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    options: PromotionProductOption[],
  ) {
    setter((current) => {
      const next = new Set(current);
      options.forEach((item) => next.add(item.id));
      return next;
    });
  }

  const totalSelected = selectedSupplements.size + selectedFitness.size;

  return (
    <form action={action} className="promotion-selector">
      <input type="hidden" name="promotion_id" value={promotionId} />

      {[...selectedSupplements].map((id) => (
        <input
          key={`supp-hidden-${id}`}
          type="hidden"
          name="supplementProductIds"
          value={id}
        />
      ))}

      {[...selectedFitness].map((id) => (
        <input
          key={`fit-hidden-${id}`}
          type="hidden"
          name="fitnessVariantIds"
          value={id}
        />
      ))}

      <div className="promotion-selector-search">
        <Search size={17} />
        <input
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar produto, categoria, tamanho ou cor..."
        />
      </div>

      {(operationScope === "supplements" || operationScope === "both") && (
        <section className="promotion-selector-group">
          <div className="promotion-selector-group-head">
            <div>
              <strong>Suplementos</strong>
              <small>
                Produtos Z ficam fora da promoção pública. Curva C pode ser
                adicionada manualmente quando houver estoque.
              </small>
            </div>

            <button
              type="button"
              className="button ghost compact-button"
              onClick={() =>
                selectVisible(setSelectedSupplements, visibleSupplements)
              }
            >
              Selecionar visíveis
            </button>
          </div>

          <div className="promotion-selector-list">
            {visibleSupplements.map((item) => (
              <label
                className={`promotion-selector-item ${
                  selectedSupplements.has(item.id) ? "selected" : ""
                }`}
                key={item.id}
              >
                <input
                  type="checkbox"
                  checked={selectedSupplements.has(item.id)}
                  onChange={() => toggle(setSelectedSupplements, item.id)}
                />

                <span>
                  <strong>{item.label}</strong>
                  <small>
                    {item.meta} · R$ {item.currentPrice.toFixed(2).replace(".", ",")}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {(operationScope === "fitness" || operationScope === "both") && (
        <section className="promotion-selector-group">
          <div className="promotion-selector-group-head">
            <div>
              <strong>Fitness</strong>
              <small>
                Selecione uma ou várias combinações de peça, tamanho e cor.
              </small>
            </div>

            <button
              type="button"
              className="button ghost compact-button"
              onClick={() => selectVisible(setSelectedFitness, visibleFitness)}
            >
              Selecionar visíveis
            </button>
          </div>

          <div className="promotion-selector-list">
            {visibleFitness.map((item) => (
              <label
                className={`promotion-selector-item ${
                  selectedFitness.has(item.id) ? "selected" : ""
                }`}
                key={item.id}
              >
                <input
                  type="checkbox"
                  checked={selectedFitness.has(item.id)}
                  onChange={() => toggle(setSelectedFitness, item.id)}
                />

                <span>
                  <strong>{item.label}</strong>
                  <small>
                    {item.meta} · R$ {item.currentPrice.toFixed(2).replace(".", ",")}
                    {" · "}
                    {item.availableQuantity} disponível(is)
                  </small>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="promotion-selector-footer">
        <span>{totalSelected} item(ns) selecionado(s)</span>
        <button className="button gold" type="submit" disabled={totalSelected === 0}>
          Adicionar à promoção
        </button>
      </div>
    </form>
  );
}
