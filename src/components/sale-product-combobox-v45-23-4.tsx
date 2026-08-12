"use client";

import { Check, PackageSearch, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type SaleProductSearchOptionV45234 = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  available: number;
  physical: number;
  locationCode: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function SaleProductComboboxV45234({
  options,
  value,
  onChange,
}: {
  options: SaleProductSearchOptionV45234[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected =
    options.find((option) => option.id === value) ?? null;

  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());

    const rows = !needle
      ? options
      : options.filter((option) =>
          normalize(
            `${option.name} ${option.brand ?? ""} ${option.category}`,
          ).includes(needle),
        );

    return [...rows]
      .sort((a, b) => {
        const stockDelta =
          Number(b.available > 0) - Number(a.available > 0);

        if (stockDelta !== 0) return stockDelta;

        return a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 40);
  }, [options, query]);

  return (
    <div className="sale-product-combobox-v45234" ref={rootRef}>
      <div
        className={`sale-product-combobox-input-v45234 ${
          open ? "open" : ""
        }`}
      >
        <Search size={17} />
        <input
          className="input"
          value={query}
          required
          autoComplete="off"
          placeholder="Digite creatina, whey, marca..."
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);

            if (value) {
              onChange("");
            }
          }}
        />
        {selected && <Check size={16} />}
      </div>

      {open && (
        <div className="sale-product-combobox-menu-v45234">
          {filtered.length > 0 ? (
            filtered.map((option) => {
              const available = option.available > 0;

              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    available ? "has-stock" : "no-stock",
                    option.id === value ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    onChange(option.id);
                    setQuery(option.name);
                    setOpen(false);
                  }}
                >
                  <PackageSearch size={17} />
                  <span>
                    <strong>{option.name}</strong>
                    <small>
                      {[option.brand, option.category]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <em>
                    {available
                      ? `${option.available} disp. · ${option.locationCode}`
                      : `Sem estoque · ${option.locationCode}`}
                  </em>
                  {option.id === value && <Check size={15} />}
                </button>
              );
            })
          ) : (
            <div className="sale-product-combobox-empty-v45234">
              Nenhum produto encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}