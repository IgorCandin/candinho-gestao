"use client";

import { Check, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CustomerOption } from "@/lib/types";

export function CustomerCombobox({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = customers.find((customer) => customer.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (selected && query !== selected.name) setQuery(selected.name);
    // We only sync when the selected id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");

    const rows = !normalized
      ? customers
      : customers.filter((customer) =>
          `${customer.name} ${customer.city ?? ""} ${customer.phone ?? ""}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR")
            .includes(normalized),
        );

    return rows.slice(0, 30);
  }, [customers, query]);

  return (
    <div
      className="customer-combobox"
      ref={rootRef}
      data-customer-combobox="true"
      data-customer-id={value || ""}
    >
      <div className={`customer-combobox-input ${open ? "open" : ""}`}>
        <Search size={16} />
        <input
          className="input"
          required
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          placeholder="Digite nome, cidade ou telefone"
          autoComplete="off"
        />
        {selected && <Check size={16} />}
      </div>

      {open && (
        <div className="customer-combobox-menu">
          {filtered.length > 0 ? (
            filtered.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={customer.id === value ? "active" : ""}
                onClick={() => {
                  onChange(customer.id);
                  setQuery(customer.name);
                  setOpen(false);
                }}
              >
                <UserRound size={15} />
                <span>
                  <strong>{customer.name}</strong>
                  <small>
                    {[customer.city, customer.phone].filter(Boolean).join(" · ") ||
                      "Cliente cadastrado"}
                  </small>
                </span>
                {customer.id === value && <Check size={15} />}
              </button>
            ))
          ) : (
            <div className="customer-combobox-empty">Nenhum cliente encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}
