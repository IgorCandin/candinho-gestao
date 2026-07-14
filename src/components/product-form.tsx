"use client";

import Link from "next/link";
import { Boxes, CircleDollarSign, FileText, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { ProductManagementDetails, SupplierOption } from "@/lib/types";

type ProductDraft = {
  name: string;
  sku: string;
  category: string;
  brand: string;
  costPrice: string;
  salePrice: string;
  installmentPrice: string;
  minStock: string;
  idealStock: string;
  supplierId: string;
  description: string;
  objective: string;
  idealProfile: string;
  durationDays: string;
  information: string;
  quickMessage: string;
  keywords: string;
  level: string;
  salesCategory: string;
  active: boolean;
  restricted: boolean;
};

function initialDraft(product?: ProductManagementDetails | null): ProductDraft {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    category: product?.category ?? "",
    brand: product?.brand ?? "",
    costPrice: product ? String(product.cost_price) : "0",
    salePrice: product ? String(product.sale_price) : "0",
    installmentPrice: product ? String(product.installment_price) : "0",
    minStock: product ? String(product.min_stock) : "0",
    idealStock: product ? String(product.ideal_stock) : "0",
    supplierId: product?.default_supplier_id ?? "",
    description: product?.description ?? "",
    objective: product?.objective ?? "",
    idealProfile: product?.ideal_profile ?? "",
    durationDays: product?.duration_days ? String(product.duration_days) : "",
    information: product?.information ?? "",
    quickMessage: product?.quick_message ?? "",
    keywords: product?.keywords ?? "",
    level: product?.level ?? "",
    salesCategory: product?.sales_category ?? "",
    active: product?.active ?? true,
    restricted: product?.restricted ?? false,
  };
}

function nullableText(value: string) { return value.trim() || null; }
function numeric(value: string) { return Number(value.replace(",", ".")) || 0; }

export function ProductForm({ product, suppliers, categories }: { product?: ProductManagementDetails | null; suppliers: SupplierOption[]; categories: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(() => initialDraft(product));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isEditing = Boolean(product);
  const cost = numeric(draft.costPrice);
  const sale = numeric(draft.salePrice);
  const installment = numeric(draft.installmentPrice);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const categoryOptions = useMemo(() => [...new Set(categories)].sort((a, b) => a.localeCompare(b, "pt-BR")), [categories]);

  function update<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (!draft.name.trim() || !draft.category.trim()) throw new Error("Informe o nome e a categoria do produto.");
      if ([cost, sale, installment, numeric(draft.minStock), numeric(draft.idealStock)].some((value) => value < 0)) throw new Error("Preços e níveis de estoque não podem ser negativos.");
      const supabase = createClient();
      const params = {
        p_name: draft.name.trim(),
        p_category: draft.category.trim(),
        p_brand: nullableText(draft.brand),
        p_sku: nullableText(draft.sku),
        p_cost_price: cost,
        p_sale_price: sale,
        p_installment_price: installment,
        p_min_stock: numeric(draft.minStock),
        p_ideal_stock: numeric(draft.idealStock),
        p_default_supplier_id: draft.supplierId || null,
        p_description: nullableText(draft.description),
        p_objective: nullableText(draft.objective),
        p_ideal_profile: nullableText(draft.idealProfile),
        p_duration_days: draft.durationDays ? Number(draft.durationDays) : null,
        p_information: nullableText(draft.information),
        p_quick_message: nullableText(draft.quickMessage),
        p_keywords: nullableText(draft.keywords),
        p_level: nullableText(draft.level),
        p_sales_category: nullableText(draft.salesCategory),
        p_restricted: draft.restricted,
        p_active: draft.active,
      };
      const { data, error } = isEditing
        ? await supabase.rpc("update_product_record", { p_product_id: product!.id, ...params })
        : await supabase.rpc("create_product_record", params);
      if (error) throw error;
      const productId = String(data);
      router.push(`/produtos/${productId}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="product-editor-layout" onSubmit={submit}>
      <div className="product-editor-main">
        <article className="panel">
          <div className="panel-head"><div><h2>Identificação</h2><p>Nome, categoria e organização do catálogo.</p></div><Boxes size={20} /></div>
          <div className="panel-body form-grid-two">
            <label className="field field-span-two"><span>Nome do produto</span><input className="input" required value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Ex.: Creatina Candinho 300g" /></label>
            <label className="field"><span>Categoria</span><input className="input" list="product-categories" required value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder="Força, Energia, Saúde..." /><datalist id="product-categories">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist></label>
            <label className="field"><span>Marca</span><input className="input" value={draft.brand} onChange={(event) => update("brand", event.target.value)} placeholder="Marca do produto" /></label>
            <label className="field"><span>SKU / código interno</span><input className="input" value={draft.sku} onChange={(event) => update("sku", event.target.value)} placeholder="Opcional" /></label>
            <label className="field"><span>Fornecedor padrão</span><select className="select" value={draft.supplierId} onChange={(event) => update("supplierId", event.target.value)}><option value="">Sem fornecedor padrão</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Preços e estoque</h2><p>Dados internos usados em vendas, margens e reposição.</p></div><CircleDollarSign size={20} /></div>
          <div className="panel-body form-grid-three">
            <label className="field"><span>Preço de custo</span><input className="input" type="number" min="0" step="0.01" required value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)} /></label>
            <label className="field"><span>Preço à vista</span><input className="input" type="number" min="0" step="0.01" required value={draft.salePrice} onChange={(event) => update("salePrice", event.target.value)} /></label>
            <label className="field"><span>Preço a prazo</span><input className="input" type="number" min="0" step="0.01" required value={draft.installmentPrice} onChange={(event) => update("installmentPrice", event.target.value)} /></label>
            <label className="field"><span>Estoque mínimo</span><input className="input" type="number" min="0" step="1" required value={draft.minStock} onChange={(event) => update("minStock", event.target.value)} /></label>
            <label className="field"><span>Estoque ideal</span><input className="input" type="number" min="0" step="1" required value={draft.idealStock} onChange={(event) => update("idealStock", event.target.value)} /></label>
            <div className="product-margin-preview"><span>Lucro unitário previsto</span><strong>{formatCurrency(profit)}</strong><small>{margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre a venda</small></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Informações comerciais</h2><p>Conteúdo usado no atendimento e na apresentação do produto.</p></div><FileText size={20} /></div>
          <div className="panel-body product-copy-editor">
            <label className="field"><span>Descrição</span><textarea className="textarea" rows={3} value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
            <label className="field"><span>Objetivo</span><textarea className="textarea" rows={2} value={draft.objective} onChange={(event) => update("objective", event.target.value)} /></label>
            <label className="field"><span>Perfil ideal</span><textarea className="textarea" rows={2} value={draft.idealProfile} onChange={(event) => update("idealProfile", event.target.value)} /></label>
            <div className="form-grid-three">
              <label className="field"><span>Duração / doses</span><input className="input" type="number" min="1" step="1" value={draft.durationDays} onChange={(event) => update("durationDays", event.target.value)} placeholder="Ex.: 100" /></label>
              <label className="field"><span>Nível</span><input className="input" value={draft.level} onChange={(event) => update("level", event.target.value)} placeholder="Essencial, forte..." /></label>
              <label className="field"><span>Categoria de vendas</span><input className="input" value={draft.salesCategory} onChange={(event) => update("salesCategory", event.target.value)} placeholder="A, B, C..." /></label>
            </div>
            <label className="field"><span>Informativo</span><textarea className="textarea" rows={3} value={draft.information} onChange={(event) => update("information", event.target.value)} /></label>
            <label className="field"><span>Mensagem rápida</span><textarea className="textarea" rows={3} value={draft.quickMessage} onChange={(event) => update("quickMessage", event.target.value)} /></label>
            <label className="field"><span>Palavras-chave</span><input className="input" value={draft.keywords} onChange={(event) => update("keywords", event.target.value)} placeholder="Separe por vírgulas" /></label>
          </div>
        </article>
      </div>

      <aside className="product-editor-side">
        <article className="panel">
          <div className="panel-head"><div><h2>Disponibilidade</h2><p>Controle como o produto aparece e pode ser usado.</p></div><ShieldCheck size={20} /></div>
          <div className="panel-body product-switch-list">
            <label className="switch-row"><div><strong>Produto ativo</strong><span>Disponível para vendas, estoque e catálogo.</span></div><input type="checkbox" checked={draft.active} onChange={(event) => update("active", event.target.checked)} /></label>
            <label className="switch-row"><div><strong>Produto restrito</strong><span>Identifica itens que exigem atenção especial.</span></div><input type="checkbox" checked={draft.restricted} onChange={(event) => update("restricted", event.target.checked)} /></label>
          </div>
        </article>

        <article className="panel product-editor-summary">
          <div className="panel-head"><div><h2>Resumo</h2><p>Confira antes de salvar.</p></div></div>
          <div className="panel-body">
            <dl>
              <div><dt>Produto</dt><dd>{draft.name || "Sem nome"}</dd></div>
              <div><dt>Categoria</dt><dd>{draft.category || "—"}</dd></div>
              <div><dt>Custo</dt><dd>{formatCurrency(cost)}</dd></div>
              <div><dt>Venda</dt><dd>{formatCurrency(sale)}</dd></div>
              <div><dt>A prazo</dt><dd>{formatCurrency(installment)}</dd></div>
            </dl>
            {message && <p className="form-error visible">{message}</p>}
            <button className="button gold product-save-button" disabled={loading} type="submit">{loading ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{loading ? "Salvando" : isEditing ? "Salvar alterações" : "Cadastrar produto"}</button>
            <Link className="button ghost product-cancel-button" href={product ? `/produtos/${product.id}` : "/produtos"}>Cancelar</Link>
          </div>
        </article>
      </aside>
    </form>
  );
}
