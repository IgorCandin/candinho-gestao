"use client";

import {
  Search,
  UserPlus,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import styles from "./fitness-customer-picker.module.css";

export type FitnessCustomerPick = {
  id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  source: string | null;
  active: boolean;
};

function normalize(value: string | null | undefined) {
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
  const selected = customers.find(
    (customer) => customer.id === selectedId,
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const needle = normalize(query.trim());

    if (!needle) {
      return customers
        .filter((customer) => customer.active)
        .slice(0, 8);
    }

    return customers
      .filter((customer) => {
        if (!customer.active) return false;

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
      .slice(0, 12);
  }, [customers, query]);

  if (selected) {
    return (
      <div className={styles.selected}>
        <div>
          <span>Cliente selecionado</span>
          <strong>{selected.name}</strong>
          <small>
            {[
              selected.phone,
              selected.city,
              selected.source === "Candinho Company"
                ? "já estava na Candinho"
                : "cliente Fitness",
            ]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </div>

        <button
          type="button"
          className="icon-button"
          aria-label="Trocar cliente"
          onClick={() => {
            onNew();
            setQuery("");
            setOpen(true);
          }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.search}>
        <Search size={16} />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder="Buscar nome, telefone, cidade..."
          autoComplete="off"
        />
      </label>

      {open && (
        <div className={styles.results}>
          {results.map((customer) => (
            <button
              type="button"
              key={customer.id}
              onClick={() => {
                onSelect(customer.id);
                setQuery(customer.name);
                setOpen(false);
              }}
            >
              <div>
                <strong>{customer.name}</strong>
                <small>
                  {[customer.phone, customer.city]
                    .filter(Boolean)
                    .join(" · ") || "Sem telefone/cidade"}
                </small>
              </div>

              <span
                data-company={
                  customer.source === "Candinho Company"
                    ? "true"
                    : "false"
                }
              >
                {customer.source === "Candinho Company"
                  ? "Candinho"
                  : "Fitness"}
              </span>
            </button>
          ))}

          {results.length === 0 && (
            <div className={styles.empty}>
              Nenhum cliente encontrado.
            </div>
          )}

          <button
            className={styles.newCustomer}
            type="button"
            onClick={() => {
              onNew();
              setOpen(false);
            }}
          >
            <UserPlus size={15} />
            Cadastrar como nova pessoa
          </button>
        </div>
      )}

      <small className={styles.help}>
        A busca reúne clientes de Suplementos/Company e
        Fitness. Se a pessoa já existe, não precisa
        cadastrar de novo.
      </small>
    </div>
  );
}
