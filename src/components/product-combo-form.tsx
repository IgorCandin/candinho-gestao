"use client";

import Link from "next/link";
import { Boxes, CircleDollarSign, Layers3, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { ProductComboDetails, ProductOption } from "@/lib/types";

type DraftItem = { key: string; productId: string; quantity: string };
function key() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`; }

export function ProductComboForm({ combo, products }: { combo?: ProductComboDetails | null; products: ProductOption[] }) {
  const router = useRouter();
  const [name, setName] = useState(combo?.name ?? "");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [salePrice, setSalePrice] = useState(combo ? String(combo.sale_price) : "0");
  const [installmentPrice, setInstallmentPrice] = useState(combo ? String(combo.installment_price) : "0");
  const [imageUrl, setImageUrl] = useState(combo?.image_url ?? "");
  const [active, setActive] = useState(combo?.active ?? true);
  const [items, setItems] = useState<DraftItem[]>(combo?.items.length ? combo.items.map((item) => ({ key: key(), productId: item.product_id, quantity: String(item.quantity) })) : [{ key: key(), productId: "", quantity: "1" }, { key: key(), productId: "", quantity: "1" }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const estimatedRetail = items.reduce((sum, item) => {
    const product = productById.get(item.productId) as (ProductOption & { sale_price?: number }) | undefined;
    return sum + (Number(product?.sale_price ?? 0) * Math.max(Number(item.quantity) || 0, 0));
  }, 0);
  const comboPrice = Math.max(Number(salePrice) || 0, 0);

  function updateItem(itemKey: string, changes: Partial<DraftItem>) {
    setItems((current) => current.map((item) => item.key === itemKey ? { ...item, ...changes } : item));
  }
  function addItem() { setItems((current) => [...current, { key: key(), productId: "", quantity: "1" }]); }
  function removeItem(itemKey: string) { setItems((current) => current.length <= 2 ? current : current.filter((item) => item.key !== itemKey)); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(null);
    try {
      if (!name.trim()) throw new Error("Informe o nome do combo.");
      if (items.length < 2 || items.some((item) => !item.productId || Number(item.quantity) <= 0)) throw new Error("Selecione pelo menos 2 produtos com quantidades válidas.");
      if (new Set(items.map((item) => item.productId)).size !== items.length) throw new Error("O mesmo produto não pode aparecer duas vezes no combo.");
      const supabase = createClient();
      const { error } = await supabase.rpc("save_product_combo", {
        p_combo_id: combo?.id ?? null,
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_sale_price: comboPrice,
        p_installment_price: Math.max(Number(installmentPrice) || comboPrice, 0),
        p_image_url: imageUrl.trim() || null,
        p_active: active,
        p_items: items.map((item) => ({ product_id: item.productId, quantity: Number(item.quantity) })),
      });
      if (error) throw error;
      router.push("/produtos/combos");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o combo.");
    } finally { setLoading(false); }
  }

  return <form className="product-editor-layout" onSubmit={submit}>
    <div className="product-editor-main">
      <article className="panel">
        <div className="panel-head"><div><h2>Identificação do combo</h2><p>O combo é uma oferta comercial. O estoque continua sendo controlado pelos produtos que fazem parte dele.</p></div><Layers3 size={20}/></div>
        <div className="panel-body form-grid-two">
          <label className="field field-span-two"><span>Nome do combo</span><input className="input" required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex.: Combo Foco Total"/></label>
          <label className="field"><span>Preço à vista</span><input className="input" type="number" min="0" step="0.01" value={salePrice} onChange={(e)=>setSalePrice(e.target.value)}/></label>
          <label className="field"><span>Preço a prazo</span><input className="input" type="number" min="0" step="0.01" value={installmentPrice} onChange={(e)=>setInstallmentPrice(e.target.value)}/></label>
          <label className="field field-span-two"><span>Imagem do combo (URL opcional)</span><input className="input" value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} placeholder="Cole a URL de uma arte do combo"/></label>
          <label className="field field-span-two"><span>Descrição</span><textarea className="textarea" rows={4} value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Explique o objetivo do combo e para quem ele é indicado."/></label>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Produtos do combo</h2><p>Cadastre os itens reais que formam a oferta. Isso permite calcular custo e disponibilidade sem criar estoque fictício de combo.</p></div><button className="button ghost compact-button" type="button" onClick={addItem}><Plus size={16}/>Adicionar produto</button></div>
        <div className="panel-body sale-form-items">
          {items.map((item,index)=><div className="sale-form-item" key={item.key}>
            <div className="sale-form-item-head"><strong>Produto {index+1}</strong>{items.length>2&&<button className="icon-button" type="button" onClick={()=>removeItem(item.key)} aria-label="Remover produto"><Trash2 size={16}/></button>}</div>
            <div className="sale-form-item-grid combo-item-grid">
              <label className="field sale-product-field"><span>Produto</span><select className="select" required value={item.productId} onChange={(e)=>updateItem(item.key,{productId:e.target.value})}><option value="">Selecione o produto</option>{products.map((product)=><option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              <label className="field"><span>Quantidade</span><input className="input" type="number" min="1" step="1" value={item.quantity} onChange={(e)=>updateItem(item.key,{quantity:e.target.value})}/></label>
            </div>
          </div>)}
        </div>
      </article>
    </div>

    <aside className="product-editor-side">
      <article className="panel">
        <div className="panel-head"><div><h2>Disponibilidade</h2><p>Combos inativos ficam guardados, mas deixam de aparecer como oferta.</p></div><Boxes size={20}/></div>
        <div className="panel-body product-switch-list"><label className="switch-row"><div><strong>Combo ativo</strong><span>Disponível para uso comercial.</span></div><input type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)}/></label></div>
      </article>
      <article className="panel product-editor-summary">
        <div className="panel-head"><div><h2>Resumo comercial</h2><p>Confira a composição antes de salvar.</p></div><CircleDollarSign size={20}/></div>
        <div className="panel-body"><dl>
          <div><dt>Itens</dt><dd>{items.length}</dd></div>
          <div><dt>Preço do combo</dt><dd>{formatCurrency(comboPrice)}</dd></div>
          {estimatedRetail>0&&<div><dt>Soma estimada avulsa</dt><dd>{formatCurrency(estimatedRetail)}</dd></div>}
        </dl>{message&&<p className="form-error visible">{message}</p>}<button className="button gold product-save-button" type="submit" disabled={loading}>{loading?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>} {loading?"Salvando":combo?"Salvar combo":"Criar combo"}</button><Link className="button ghost product-cancel-button" href="/produtos/combos">Cancelar</Link></div>
      </article>
    </aside>
  </form>;
}
