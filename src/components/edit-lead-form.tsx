"use client";

import Link from "next/link";
import { FilePenLine, LoaderCircle, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CustomerOption, ProductOption } from "@/lib/types";

const STATUSES = [
  "Perguntou sobre",
  "Decidindo",
  "Está quase comprando",
  "Esperando receber",
  "Esperando pedido de fornecedor",
  "Cotação",
  "Aguardando",
] as const;

type FlavorOption = { id: string; productId: string; name: string };

export function EditLeadForm({
  leadId,
  customers,
  products,
  initialCustomerId,
  initialProductId,
  initialFlavorId,
  initialStatus,
  initialNotes,
}: {
  leadId: string;
  customers: CustomerOption[];
  products: ProductOption[];
  initialCustomerId: string;
  initialProductId: string;
  initialFlavorId: string;
  initialStatus: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [productId, setProductId] = useState(initialProductId);
  const [flavorId, setFlavorId] = useState(initialFlavorId);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(
    STATUSES.includes(initialStatus as (typeof STATUSES)[number])
      ? (initialStatus as (typeof STATUSES)[number])
      : "Perguntou sobre",
  );
  const [notes, setNotes] = useState(initialNotes);
  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFlavors() {
      const { data, error } = await createClient()
        .from("product_flavors")
        .select("id,product_id,name")
        .eq("active", true)
        .order("display_order")
        .order("name");

      if (cancelled) return;
      if (error) {
        setMessage(error.message);
        return;
      }

      setFlavors(
        (data ?? []).map((row) => ({
          id: String(row.id),
          productId: String(row.product_id),
          name: String(row.name ?? ""),
        })),
      );
    }

    void loadFlavors();
    return () => {
      cancelled = true;
    };
  }, []);

  const productFlavors = flavors.filter((flavor) => flavor.productId === productId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!customerId || !productId) {
        throw new Error("Selecione o cliente e o produto.");
      }

      const supabase = createClient();
      const { error } = await supabase.rpc("update_lead_v1", {
        p_lead_id: leadId,
        p_customer_id: customerId,
        p_product_id: productId,
        p_flavor_id: flavorId || null,
        p_lead_status: status,
        p_notes: notes.trim() || null,
      });

      if (error) throw error;

      router.push(`/leads/${leadId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o lead.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel compact-form-panel" onSubmit={submit}>
      <div className="panel-head">
        <div>
          <h2>Editar lead</h2>
          <p>Troque cliente, produto, sabor, status ou observação sem criar outro lead.</p>
        </div>
        <FilePenLine size={20} />
      </div>

      <div className="panel-body form-grid-two">
        <label className="field">
          <span>Cliente</span>
          <select className="select" required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Selecione o cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}{customer.city ? ` · ${customer.city}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Produto de interesse</span>
          <select
            className="select"
            required
            value={productId}
            onChange={(event) => {
              setProductId(event.target.value);
              setFlavorId("");
            }}
          >
            <option value="">Selecione o produto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </label>

        {productFlavors.length > 0 && (
          <label className="field">
            <span>Sabor de interesse</span>
            <select className="select" value={flavorId} onChange={(event) => setFlavorId(event.target.value)}>
              <option value="">Ainda não decidiu</option>
              {productFlavors.map((flavor) => (
                <option key={flavor.id} value={flavor.id}>{flavor.name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>Status do lead</span>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof STATUSES)[number])}
          >
            {STATUSES.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>

        <label className="field field-span-two">
          <span>Observações</span>
          <textarea
            className="textarea"
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Dúvidas, objetivo, mudança de produto, sabor ou próximo passo."
          />
        </label>
      </div>

      <div className="form-footer">
        <Link className="button ghost" href={`/leads/${leadId}`}>Cancelar</Link>
        <button className="button gold" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}
    </form>
  );
}
