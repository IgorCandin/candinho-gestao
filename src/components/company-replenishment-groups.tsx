"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Check, LoaderCircle, Plus, Settings2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type CompanyReplenishmentProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  quantity: number;
};

export type CompanyReplenishmentGroup = {
  id: string;
  name: string;
  minimum_stock: number;
  ideal_stock: number;
  preferred_product_id: string | null;
  product_ids: string[];
};

export function CompanyReplenishmentGroups({
  groups,
  products,
}: {
  groups: CompanyReplenishmentGroup[];
  products: CompanyReplenishmentProduct[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [minimum, setMinimum] = useState("1");
  const [ideal, setIdeal] = useState("2");
  const [selected, setSelected] = useState<string[]>([]);
  const [preferred, setPreferred] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const availableProducts = useMemo(() => {
    const assigned = new Set(groups.flatMap((group) => group.product_ids));
    return products.filter((product) => !assigned.has(product.id));
  }, [groups, products]);

  function toggleProduct(productId: string) {
    setSelected((current) => {
      const next = current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId];
      if (!next.includes(preferred)) setPreferred(next[0] ?? "");
      return next;
    });
  }

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!name.trim() || selected.length < 2 || !preferred) {
      setMessage("Informe o nome, escolha pelo menos dois produtos e marque o preferido.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: group, error: groupError } = await supabase
        .from("replenishment_groups")
        .insert({
          name: name.trim(),
          minimum_stock: Number(minimum),
          ideal_stock: Number(ideal),
          preferred_product_id: preferred,
        })
        .select("id")
        .single();
      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("replenishment_group_products")
        .insert(selected.map((productId) => ({ group_id: group.id, product_id: productId })));
      if (memberError) {
        await supabase.from("replenishment_groups").delete().eq("id", group.id);
        throw memberError;
      }

      setCreating(false);
      setName("");
      setSelected([]);
      setPreferred("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o grupo.");
    } finally {
      setLoading(false);
    }
  }

  async function removeGroup(groupId: string) {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("replenishment_groups").delete().eq("id", groupId);
      if (error) throw error;
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível remover o grupo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="company-groups-section">
      <div className="company-section-heading">
        <div>
          <span>Regra inteligente</span>
          <h2>Grupos de reposição</h2>
          <p>Some produtos equivalentes e compre apenas a marca preferida quando o grupo realmente estiver baixo.</p>
        </div>
        <button className="button gold" type="button" onClick={() => setCreating((value) => !value)}>
          <Plus size={16} /> Novo grupo
        </button>
      </div>

      {creating && (
        <form className="panel company-group-form" onSubmit={createGroup}>
          <div className="company-group-form-grid">
            <label className="field"><span>Nome do grupo</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Beta-alanina" /></label>
            <label className="field"><span>Estoque mínimo do grupo</span><input className="input" type="number" min="0" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label>
            <label className="field"><span>Estoque ideal do grupo</span><input className="input" type="number" min={minimum || "0"} value={ideal} onChange={(event) => setIdeal(event.target.value)} /></label>
          </div>
          <div className="company-product-picker">
            {availableProducts.map((product) => {
              const checked = selected.includes(product.id);
              return (
                <button type="button" className={checked ? "is-selected" : ""} key={product.id} onClick={() => toggleProduct(product.id)}>
                  <span>{checked ? <Check size={15} /> : <Boxes size={15} />}</span>
                  <div><strong>{product.name}</strong><small>{product.brand ?? "Sem marca"} · estoque {product.quantity}</small></div>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <label className="field"><span>Produto preferido para comprar</span><select className="select" value={preferred} onChange={(event) => setPreferred(event.target.value)}>{selected.map((id) => { const product = products.find((item) => item.id === id); return <option value={id} key={id}>{product?.name}</option>; })}</select></label>
          )}
          <button className="button gold" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <Settings2 size={16} />}Salvar grupo</button>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="company-empty-state"><Boxes size={24} /><strong>Nenhum grupo criado ainda</strong><span>Crie Beta-alanina, HMB ou outro grupo apenas quando decidir quais produtos são equivalentes.</span></div>
      ) : (
        <div className="company-group-grid">
          {groups.map((group) => {
            const members = products.filter((product) => group.product_ids.includes(product.id));
            const total = members.reduce((sum, product) => sum + product.quantity, 0);
            const preferredProduct = products.find((product) => product.id === group.preferred_product_id);
            const shortage = Math.max(group.ideal_stock - total, 0);
            return (
              <article className="panel company-group-card" key={group.id}>
                <div><span className={total <= group.minimum_stock ? "company-status danger" : "company-status ok"}>{total <= group.minimum_stock ? "Comprar" : "Cobertura suficiente"}</span><h3>{group.name}</h3><p>{members.map((item) => item.brand ?? item.name).join(" + ")}</p></div>
                <div className="company-group-metrics"><span>Estoque total<strong>{total}</strong></span><span>Mínimo<strong>{group.minimum_stock}</strong></span><span>Sugestão<strong>{total <= group.minimum_stock ? shortage : 0}</strong></span></div>
                <small>Comprar preferencialmente: <strong>{preferredProduct?.name ?? "Não definido"}</strong></small>
                <button className="button ghost compact-button" type="button" disabled={loading} onClick={() => void removeGroup(group.id)}><Trash2 size={14} />Remover grupo</button>
              </article>
            );
          })}
        </div>
      )}
      {message && <p className="sale-action-message">{message}</p>}
    </section>
  );
}
