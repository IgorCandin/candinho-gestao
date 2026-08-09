"use client";

import {
  Check,
  Search,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type FitnessCustomerPick = {
  id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  source: string | null;
  active: boolean;
};

function normalize(
  value: string | null | undefined,
) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function FitnessCustomerPicker({
  customers,
  selectedId,
  onSelect,
  onNew,
}: {
  customers: FitnessCustomerPick[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    customers.find(
      (customer) => customer.id === selectedId,
    ) ?? null;

  const [query, setQuery] = useState(
    selected?.name ?? "",
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (
        !rootRef.current?.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", close);
    return () =>
      document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (selected) {
      setQuery(selected.name);
    }
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());

    return customers
      .filter((customer) => {
        if (!customer.active) return false;
        if (!needle) return true;

        return [
          customer.name,
          customer.phone,
          customer.city,
          customer.instagram,
        ].some((value) =>
          normalize(value).includes(needle),
        );
      })
      .sort((a, b) => {
        const aStarts = normalize(a.name).startsWith(
          needle,
        )
          ? 1
          : 0;
        const bStarts = normalize(b.name).startsWith(
          needle,
        )
          ? 1
          : 0;

        return (
          bStarts - aStarts ||
          a.name.localeCompare(b.name, "pt-BR")
        );
      })
      .slice(0, 30);
  }, [customers, query]);

  return (
    <div
      ref={rootRef}
      className="customer-combobox fitness-customer-combobox-v4515"
      data-selected={selected ? "true" : "false"}
      data-customer-id={selectedId || ""}
    >
      <div
        className={`customer-combobox-input ${
          open ? "open" : ""
        }`}
      >
        <Search size={16} />

        <input
          className="input"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value;

            setQuery(next);
            setOpen(true);

            if (selectedId) {
              onNew();
            }
          }}
          placeholder="Digite nome, cidade ou telefone"
          autoComplete="off"
        />

        {selected && <Check size={16} />}
      </div>

      {selected && (
        <div className="fitness-customer-selected-meta-v4515">
          <UserRound size={13} />
          <span>
            {[
              selected.phone,
              selected.city,
              selected.source === "Candinho Company"
                ? "Cliente Company"
                : "Cliente Fitness",
            ]
              .filter(Boolean)
              .join(" · ") || "Cliente selecionado"}
          </span>
        </div>
      )}

      {open && (
        <div className="customer-combobox-menu">
          {filtered.length > 0 ? (
            filtered.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={
                  customer.id === selectedId
                    ? "active"
                    : ""
                }
                onClick={() => {
                  onSelect(customer.id);
                  setQuery(customer.name);
                  setOpen(false);
                }}
              >
                <UserRound size={15} />

                <span>
                  <strong>{customer.name}</strong>
                  <small>
                    {[
                      customer.city,
                      customer.phone,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "Cliente cadastrado"}
                  </small>
                </span>

                {customer.id === selectedId && (
                  <Check size={15} />
                )}
              </button>
            ))
          ) : (
            <div className="customer-combobox-empty">
              Nenhum cliente encontrado.
            </div>
          )}

          <button
            className="fitness-customer-new-v4515"
            type="button"
            onClick={() => {
              onNew();
              setQuery("");
              setOpen(false);
            }}
          >
            <UserPlus size={15} />
            <span>
              <strong>Novo cliente</strong>
              <small>
                Preencher os dados nesta venda
              </small>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
