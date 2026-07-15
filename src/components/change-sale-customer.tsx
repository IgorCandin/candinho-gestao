"use client";

import { LoaderCircle, Save, UserRoundPen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CustomerOption = { id: string; name: string; city: string | null; phone: string | null };

export function ChangeSaleCustomer({
  saleId,
  currentCustomerId,
  currentCustomerName,
}: {
  saleId: string;
  currentCustomerId: string | null;
  currentCustomerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedId, setSelectedId] = useState(currentCustomerId ?? "");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    setMessage(null);
    if (!nextOpen || customers.length > 0) return;

    setLoadingList(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("customers")
      .select("id,name,city,phone")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) setMessage(error.message);
    else setCustomers((data ?? []) as CustomerOption[]);
    setLoadingList(false);
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.city ?? "", customer.phone ?? ""]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term)
    );
  }, [customers, search]);

  async function save() {
    if (!selectedId || selectedId === currentCustomerId) {
      setMessage(selectedId === currentCustomerId ? "Selecione um cliente diferente do atual." : "Selecione o cliente correto.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("change_sale_customer", {
        p_sale_id: saleId,
        p_customer_id: selectedId,
      });
      if (error) throw error;
      setMessage("Cliente corrigido com sucesso. Estoque, valores, pagamento, entrega e parceria foram preservados.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível corrigir o cliente da venda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="change-sale-customer">
      <button className="button ghost" type="button" onClick={toggleOpen}>
        <UserRoundPen size={17} />Alterar cliente
      </button>

      {open && (
        <div className="change-sale-customer-panel">
          <div className="sale-action-form-head">
            <div>
              <strong>Corrigir cliente da venda</strong>
              <span>Cliente atual: {currentCustomerName}. A correção não cancela nem recria a venda.</span>
            </div>
            <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={17} /></button>
          </div>
          <label className="field">
            <span>Buscar cliente</span>
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, cidade ou telefone" />
          </label>
          <label className="field">
            <span>Cliente correto</span>
            <select className="select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loadingList}>
              <option value="">{loadingList ? "Carregando clientes..." : "Selecione"}</option>
              {filtered.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.city ? ` · ${customer.city}` : ""}{customer.phone ? ` · ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button className="button gold" type="button" onClick={save} disabled={saving || loadingList}>
            {saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            {saving ? "Salvando" : "Confirmar correção"}
          </button>
        </div>
      )}
      {message && <p className="sale-action-message" aria-live="polite">{message}</p>}
    </div>
  );
}
