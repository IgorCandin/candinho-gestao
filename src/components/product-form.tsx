"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Globe2,
  ListPlus,
  LoaderCircle,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type FlavorDraft = {
  key: string;
  id: string | null;
  name: string;
  active: boolean;
  displayOrder: number;
};

type StockLocation = {
  id: string;
  code: string;
  name: string;
  physicalQuantity: number;
};

type ProductEnrichmentSuggestions = {
  brand: string | null;
  category: string | null;
  description: string | null;
  objective: string | null;
  ideal_profile: string | null;
  duration_days: number | null;
  information: string | null;
  quick_message: string | null;
  keywords: string | null;
  level: string | null;
};

type ProductEnrichmentPreview = {
  suggestions: ProductEnrichmentSuggestions;
  confidence: "alta" | "media" | "baixa";
  research_note: string | null;
  sources: string[];
  saved: boolean;
  fallbackUsed: boolean;
};

function sourceHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

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
function flavorKey() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`; }

export function ProductForm({ product, suppliers, categories }: {
  product?: ProductManagementDetails | null;
  suppliers: SupplierOption[];
  categories: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft>(() => initialDraft(product));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [flavorMode, setFlavorMode] = useState(false);
  const [flavorLoading, setFlavorLoading] = useState(Boolean(product));
  const [flavorAlreadyEnabled, setFlavorAlreadyEnabled] = useState(false);
  const [flavors, setFlavors] = useState<FlavorDraft[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [historyPending, setHistoryPending] = useState(0);

  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<ProductEnrichmentPreview | null>(null);
  const [enrichmentFeedback, setEnrichmentFeedback] = useState<string | null>(null);

  const isEditing = Boolean(product);
  const cost = numeric(draft.costPrice);
  const sale = numeric(draft.salePrice);
  const installment = numeric(draft.installmentPrice);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;

  const categoryOptions = useMemo(
    () => [...new Set(categories)].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [categories],
  );

  const activeFlavors = useMemo(
    () => flavors.filter((flavor) => flavor.active && flavor.name.trim()),
    [flavors],
  );

  const enrichmentAvailableCount = useMemo(() => {
    if (!enrichment) return 0;
    const suggestions = enrichment.suggestions;
    return [
      !draft.brand.trim() && suggestions.brand,
      !draft.category.trim() && suggestions.category,
      !draft.description.trim() && suggestions.description,
      !draft.objective.trim() && suggestions.objective,
      !draft.idealProfile.trim() && suggestions.ideal_profile,
      !draft.durationDays.trim() && suggestions.duration_days,
      !draft.information.trim() && suggestions.information,
      !draft.quickMessage.trim() && suggestions.quick_message,
      !draft.keywords.trim() && suggestions.keywords,
      !draft.level.trim() && suggestions.level,
    ].filter(Boolean).length;
  }, [draft, enrichment]);

  useEffect(() => {
    if (!product) {
      setFlavorLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFlavorSetup() {
      const supabase = createClient();
      const [flavorResult, summaryResult, locationsResult, inventoryResult, pendingResult] = await Promise.all([
        supabase.from("product_flavors").select("id,name,active,display_order").eq("product_id", product!.id).eq("active", true).order("display_order").order("name"),
        supabase.from("product_flavor_summary").select("flavor_tracking_enabled").eq("product_id", product!.id).maybeSingle(),
        supabase.from("inventory_location_overview").select("location_id,location_code,location_name,physical_quantity").eq("product_id", product!.id).order("location_code"),
        supabase.from("product_flavor_inventory_overview").select("flavor_id,location_id,physical_quantity").eq("product_id", product!.id),
        supabase.from("product_flavor_history_pending").select("sale_item_id", { count: "exact", head: true }).eq("product_id", product!.id),
      ]);

      if (cancelled) return;
      const firstError = flavorResult.error || summaryResult.error || locationsResult.error || inventoryResult.error || pendingResult.error;
      if (firstError) {
        setMessage(firstError.message);
        setFlavorLoading(false);
        return;
      }

      const loadedFlavors: FlavorDraft[] = (flavorResult.data ?? []).map((row) => ({
        key: String(row.id),
        id: String(row.id),
        name: String(row.name ?? ""),
        active: Boolean(row.active),
        displayOrder: Number(row.display_order ?? 0),
      }));

      const enabled = Boolean(summaryResult.data?.flavor_tracking_enabled);
      setFlavorAlreadyEnabled(enabled);
      setFlavorMode(enabled || loadedFlavors.length > 0);
      setFlavors(loadedFlavors);
      setStockLocations((locationsResult.data ?? []).map((row) => ({
        id: String(row.location_id),
        code: String(row.location_code ?? ""),
        name: String(row.location_name ?? ""),
        physicalQuantity: Number(row.physical_quantity ?? 0),
      })));

      const nextAllocations: Record<string, string> = {};
      for (const row of inventoryResult.data ?? []) {
        nextAllocations[`${row.location_id}:${row.flavor_id}`] = String(Number(row.physical_quantity ?? 0));
      }
      setAllocations(nextAllocations);
      setHistoryPending(pendingResult.count ?? 0);
      setFlavorLoading(false);
    }

    void loadFlavorSetup();
    return () => { cancelled = true; };
  }, [product]);

  function update<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function enrichProduct() {
    setEnrichmentFeedback(null);
    setEnrichment(null);

    if (draft.name.trim().length < 3) {
      setEnrichmentFeedback("Digite primeiro um nome de produto mais completo para o Nexus pesquisar.");
      return;
    }

    setEnrichmentLoading(true);
    try {
      const response = await fetch("/api/produtos/completar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          existing: {
            brand: nullableText(draft.brand),
            category: nullableText(draft.category),
            description: nullableText(draft.description),
            objective: nullableText(draft.objective),
            ideal_profile: nullableText(draft.idealProfile),
            duration_days: draft.durationDays.trim() ? Number(draft.durationDays) : null,
            information: nullableText(draft.information),
            quick_message: nullableText(draft.quickMessage),
            keywords: nullableText(draft.keywords),
            level: nullableText(draft.level),
          },
          categories: categoryOptions,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? `Não foi possível pesquisar o produto (${response.status}).`);

      const fallbackUsed = Boolean(data?.fallback_used);
      setEnrichment({
        suggestions: {
          brand: data?.suggestions?.brand ?? null,
          category: data?.suggestions?.category ?? null,
          description: data?.suggestions?.description ?? null,
          objective: data?.suggestions?.objective ?? null,
          ideal_profile: data?.suggestions?.ideal_profile ?? null,
          duration_days: Number(data?.suggestions?.duration_days) > 0 ? Number(data.suggestions.duration_days) : null,
          information: data?.suggestions?.information ?? null,
          quick_message: data?.suggestions?.quick_message ?? null,
          keywords: data?.suggestions?.keywords ?? null,
          level: data?.suggestions?.level ?? null,
        },
        confidence: data?.confidence === "alta" || data?.confidence === "media" ? data.confidence : "baixa",
        research_note: typeof data?.research_note === "string" ? data.research_note : null,
        sources: Array.isArray(data?.sources) ? data.sources.filter((value: unknown): value is string => typeof value === "string") : [],
        saved: false,
        fallbackUsed,
      });

      setEnrichmentFeedback(
        fallbackUsed
          ? "A pesquisa pública não ficou disponível, então o Nexus usou um fallback descritivo seguro. Revise antes de aplicar."
          : "Pesquisa concluída. Revise o que o Nexus encontrou antes de aplicar.",
      );
    } catch (error) {
      setEnrichmentFeedback(error instanceof Error ? error.message : "Não foi possível pesquisar o produto.");
    } finally {
      setEnrichmentLoading(false);
    }
  }

  function applyEnrichment() {
    if (!enrichment) return;
    const suggestions = enrichment.suggestions;
    setDraft((current) => ({
      ...current,
      brand: current.brand.trim() ? current.brand : suggestions.brand ?? current.brand,
      category: current.category.trim() ? current.category : suggestions.category ?? current.category,
      description: current.description.trim() ? current.description : suggestions.description ?? current.description,
      objective: current.objective.trim() ? current.objective : suggestions.objective ?? current.objective,
      idealProfile: current.idealProfile.trim() ? current.idealProfile : suggestions.ideal_profile ?? current.idealProfile,
      durationDays: current.durationDays.trim() ? current.durationDays : suggestions.duration_days ? String(suggestions.duration_days) : current.durationDays,
      information: current.information.trim() ? current.information : suggestions.information ?? current.information,
      quickMessage: current.quickMessage.trim() ? current.quickMessage : suggestions.quick_message ?? current.quickMessage,
      keywords: current.keywords.trim() ? current.keywords : suggestions.keywords ?? current.keywords,
      level: current.level.trim() ? current.level : suggestions.level ?? current.level,
    }));
    setEnrichmentFeedback("Informações aplicadas somente nos campos vazios. Revise o formulário antes de salvar.");
  }

  function enableFlavorMode() {
    setFlavorMode(true);
    if (flavors.length === 0) {
      setFlavors([{ key: flavorKey(), id: null, name: "", active: true, displayOrder: 0 }]);
    }
  }

  function addFlavor() {
    setFlavorMode(true);
    setFlavors((current) => [...current, {
      key: flavorKey(), id: null, name: "", active: true, displayOrder: current.length,
    }]);
  }

  function updateFlavor(key: string, patch: Partial<FlavorDraft>) {
    setFlavors((current) => current.map((flavor) => flavor.key === key ? { ...flavor, ...patch } : flavor));
  }

  function removeFlavor(key: string) {
    setFlavors((current) => current.filter((flavor) => flavor.key !== key));
  }

  function allocationKey(locationId: string, flavor: FlavorDraft) {
    return `${locationId}:${flavor.id ?? flavor.key}`;
  }

  function allocationValue(locationId: string, flavor: FlavorDraft) {
    return Number(allocations[allocationKey(locationId, flavor)] ?? 0) || 0;
  }

  function allocatedAtLocation(locationId: string) {
    return activeFlavors.reduce((sum, flavor) => sum + allocationValue(locationId, flavor), 0);
  }

  function allocationStatus(location: StockLocation) {
    const allocated = allocatedAtLocation(location.id);
    const difference = location.physicalQuantity - allocated;
    if (difference === 0) return { allocated, tone: "green", label: "OK" };
    if (difference > 0) return { allocated, tone: "orange", label: `Faltam ${difference}` };
    return { allocated, tone: "red", label: `Sobram ${Math.abs(difference)}` };
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!draft.name.trim() || !draft.category.trim()) throw new Error("Informe o nome e a categoria do produto.");
      if ([cost, sale, installment, numeric(draft.minStock), numeric(draft.idealStock)].some((value) => value < 0)) {
        throw new Error("Preços e níveis de estoque não podem ser negativos.");
      }

      if (flavorMode && activeFlavors.length === 0) throw new Error("Adicione pelo menos um sabor.");
      const normalizedNames = activeFlavors.map((flavor) => flavor.name.trim().toLocaleLowerCase("pt-BR"));
      if (new Set(normalizedNames).size !== normalizedNames.length) throw new Error("Existem sabores com nomes repetidos.");

      if (flavorMode && product) {
        for (const location of stockLocations) {
          const allocated = allocatedAtLocation(location.id);
          if (allocated !== location.physicalQuantity) {
            const difference = location.physicalQuantity - allocated;
            throw new Error(
              difference > 0
                ? `Ainda faltam ${difference} unidade(s) para distribuir no estoque ${location.code}.`
                : `Foram distribuídas ${Math.abs(difference)} unidade(s) a mais no estoque ${location.code}.`,
            );
          }
        }
      }

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

      const flavorPayload = flavorMode
        ? activeFlavors.map((flavor, index) => ({
            id: flavor.id,
            name: flavor.name.trim(),
            active: true,
            display_order: index,
          }))
        : null;

      const allocationPayload = flavorMode && product
        ? stockLocations.flatMap((location) => activeFlavors.map((flavor) => ({
            location_id: location.id,
            flavor_id: flavor.id,
            flavor_name: flavor.id ? null : flavor.name.trim(),
            quantity: allocationValue(location.id, flavor),
          })))
        : [];

      const flavorParams = {
        p_enable_flavors: flavorMode,
        p_flavors: flavorPayload,
        p_flavor_allocations: allocationPayload,
      };

      const { data, error } = isEditing
        ? await supabase.rpc("update_product_record_v2", { p_product_id: product!.id, ...params, ...flavorParams })
        : await supabase.rpc("create_product_record_v2", { ...params, ...flavorParams });

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
          <div className="panel-head">
            <div><h2>Identificação</h2><p>Nome, categoria e organização do catálogo.</p></div>
            <button className="button ghost compact-button" type="button" onClick={enrichProduct} disabled={enrichmentLoading} title="O Nexus consulta dados públicos e sugere apenas campos cadastrais vazios. Dados internos não são inventados.">
              {enrichmentLoading ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {enrichmentLoading ? "Pesquisando" : "Completar com Nexus"}
            </button>
          </div>

          <div className="panel-body form-grid-two">
            <label className="field field-span-two"><span>Nome do produto</span><input className="input" required value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Ex.: Creatina Candinho 300g"/></label>
            <label className="field"><span>Categoria</span><input className="input" list="product-categories" required value={draft.category} onChange={(event) => update("category", event.target.value)} placeholder="Força, Energia, Saúde..."/><datalist id="product-categories">{categoryOptions.map((category) => <option key={category} value={category}/>)}</datalist></label>
            <label className="field"><span>Marca</span><input className="input" value={draft.brand} onChange={(event) => update("brand", event.target.value)} placeholder="Marca do produto"/></label>
            <label className="field"><span>SKU / código interno</span><input className="input" value={draft.sku} onChange={(event) => update("sku", event.target.value)} placeholder="Definido internamente"/></label>
            <label className="field"><span>Fornecedor padrão</span><select className="select" value={draft.supplierId} onChange={(event) => update("supplierId", event.target.value)}><option value="">Sem fornecedor padrão</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          </div>

          {(enrichment || enrichmentFeedback) && (
            <div className="product-nexus-enrichment">
              <div className="product-nexus-enrichment-head">
                <span className="product-nexus-enrichment-icon"><Globe2 size={17}/></span>
                <div>
                  <strong>Nexus · Cadastro assistido</strong>
                  <small>Pesquisa dados públicos e completa textos cadastrais. Preço, estoque, SKU, fornecedor e classificação ABCZ são dados internos e nunca são inventados.</small>
                </div>
                {enrichment && <span className={`badge ${enrichment.confidence === "alta" ? "green" : enrichment.confidence === "media" ? "orange" : "gray"}`}>Confiança {enrichment.confidence}</span>}
              </div>

              {enrichment?.fallbackUsed && <p className="product-nexus-research-note"><AlertTriangle size={14}/> Pesquisa pública indisponível ou insuficiente. O Nexus usou um fallback descritivo seguro sem inventar dados técnicos.</p>}
              {enrichment?.research_note && <p className="product-nexus-research-note">{enrichment.research_note}</p>}

              {enrichment && (
                <div className="product-nexus-enrichment-result">
                  <div><strong>{enrichmentAvailableCount} campo(s) vazio(s) podem ser preenchidos</strong><span>O Nexus não sobrescreve o que você já digitou.</span></div>
                  <div className="product-nexus-enrichment-actions">
                    <button className="button gold compact-button" type="button" onClick={applyEnrichment} disabled={enrichmentAvailableCount === 0}><Check size={15}/>Aplicar nos campos vazios</button>
                    <button className="button ghost compact-button" type="button" onClick={() => setEnrichment(null)}><X size={15}/>Fechar</button>
                  </div>
                </div>
              )}

              {enrichment?.sources.length ? <div className="product-nexus-sources"><span>Fontes consultadas</span><div>{enrichment.sources.slice(0, 5).map((url) => <a href={url} target="_blank" rel="noreferrer" key={url}>{sourceHost(url)}<ExternalLink size={11}/></a>)}</div></div> : null}
              {enrichmentFeedback && <p className="form-help">{enrichmentFeedback}</p>}
              <small className="product-nexus-save-warning">Nada é salvo automaticamente. Revise as sugestões e salve o produto somente quando estiver de acordo.</small>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Preços e estoque</h2><p>Dados internos usados em vendas, margens e reposição. O Nexus não altera estes campos.</p></div><CircleDollarSign size={20}/></div>
          <div className="panel-body form-grid-three">
            <label className="field"><span>Preço de custo</span><input className="input" type="number" min="0" step="0.01" required value={draft.costPrice} onChange={(event) => update("costPrice", event.target.value)}/></label>
            <label className="field"><span>Preço à vista</span><input className="input" type="number" min="0" step="0.01" required value={draft.salePrice} onChange={(event) => update("salePrice", event.target.value)}/></label>
            <label className="field"><span>Preço a prazo</span><input className="input" type="number" min="0" step="0.01" required value={draft.installmentPrice} onChange={(event) => update("installmentPrice", event.target.value)}/></label>
            <label className="field"><span>Estoque mínimo</span><input className="input" type="number" min="0" step="1" required value={draft.minStock} onChange={(event) => update("minStock", event.target.value)}/></label>
            <label className="field"><span>Estoque ideal</span><input className="input" type="number" min="0" step="1" required value={draft.idealStock} onChange={(event) => update("idealStock", event.target.value)}/></label>
            <div className="product-margin-preview"><span>Lucro unitário previsto</span><strong>{formatCurrency(profit)}</strong><small>{margin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% sobre a venda</small></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><h2>Sabores</h2><p>Ative somente para produtos em que o estoque precisa ser separado por sabor.</p></div>
            {!flavorMode
              ? <button className="button ghost compact-button" type="button" onClick={enableFlavorMode}><ListPlus size={16}/>Adicionar sabores</button>
              : <button className="button ghost compact-button" type="button" onClick={addFlavor}><Plus size={16}/>Adicionar sabor</button>}
          </div>

          <div className="panel-body">
            {flavorLoading ? <p className="form-help">Carregando configuração de sabores...</p> : !flavorMode ? (
              <div className="empty compact-empty"><Boxes size={24}/><strong>Produto sem controle por sabor</strong>O estoque continua sendo controlado apenas pelo total do produto.</div>
            ) : (
              <div className="product-flavor-flow">
                <section className="product-flavor-step">
                  <div className="product-flavor-step-title"><span>1</span><div><strong>Cadastre os sabores</strong><small>Adicione apenas os sabores que realmente existem para este produto.</small></div></div>
                  <div className="sale-form-items">
                    {flavors.map((flavor, index) => (
                      <div className="sale-form-item" key={flavor.key}>
                        <div className="sale-form-item-head"><strong>Sabor {index + 1}</strong>{flavors.length > 1 && <button className="icon-button" type="button" aria-label="Remover sabor" onClick={() => removeFlavor(flavor.key)}><Trash2 size={16}/></button>}</div>
                        <label className="field"><span>Nome do sabor</span><input className="input" value={flavor.name} onChange={(event) => updateFlavor(flavor.key, { name: event.target.value })} placeholder="Ex.: Maçã Verde"/></label>
                      </div>
                    ))}
                  </div>
                </section>

                {product && stockLocations.length > 0 && activeFlavors.length > 0 ? (
                  <section className="product-flavor-step">
                    <div className="product-flavor-step-title"><span>2</span><div><strong>Distribua o estoque atual</strong><small>Para salvar, cada local precisa ficar em OK: a soma dos sabores deve ser igual ao estoque físico.</small></div></div>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Local</th>{activeFlavors.map((flavor) => <th key={flavor.key}>{flavor.name}</th>)}<th>Distribuído</th><th>Físico</th><th>Status</th></tr></thead>
                        <tbody>{stockLocations.map((location) => {
                          const status = allocationStatus(location);
                          return <tr key={location.id}>
                            <td><strong>{location.code}</strong><small>{location.name}</small></td>
                            {activeFlavors.map((flavor) => {
                              const key = allocationKey(location.id, flavor);
                              return <td key={key}><input className="input" type="number" min="0" step="1" value={allocations[key] ?? "0"} onChange={(event) => setAllocations((current) => ({ ...current, [key]: event.target.value }))}/></td>;
                            })}
                            <td><strong>{status.allocated}</strong></td>
                            <td><strong>{location.physicalQuantity}</strong></td>
                            <td><span className={`badge ${status.tone}`}>{status.label === "OK" ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>} {status.label}</span></td>
                          </tr>;
                        })}</tbody>
                      </table>
                    </div>
                  </section>
                ) : (
                  <div className="form-help"><strong>2. Distribuição do estoque:</strong> {product ? "adicione o nome dos sabores para distribuir o estoque atual." : "depois que o produto for cadastrado e tiver estoque, você poderá distribuir as unidades entre os sabores."}</div>
                )}

                <div className="form-help"><strong>{flavorAlreadyEnabled ? "Controle por sabor ativo." : "Ao salvar, o controle por sabor será ativado."}</strong> A partir da ativação, vendas, reservas, compras, recebimentos, transferências e ajustes exigirão o sabor.</div>
                {product && historyPending > 0 && <Link className="button ghost" href={`/produtos/sabores/historico?produto=${product.id}`}>Classificar histórico sem sabor · {historyPending} pendência(s)</Link>}
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head"><div><h2>Informações comerciais</h2><p>Conteúdo usado no atendimento e na apresentação do produto.</p></div><FileText size={20}/></div>
          <div className="panel-body product-copy-editor">
            <label className="field"><span>Descrição</span><textarea className="textarea" rows={3} value={draft.description} onChange={(event) => update("description", event.target.value)}/></label>
            <label className="field"><span>Objetivo</span><textarea className="textarea" rows={2} value={draft.objective} onChange={(event) => update("objective", event.target.value)}/></label>
            <label className="field"><span>Perfil ideal</span><textarea className="textarea" rows={2} value={draft.idealProfile} onChange={(event) => update("idealProfile", event.target.value)}/></label>
            <div className="form-grid-three">
              <label className="field"><span>Duração / doses</span><input className="input" type="number" min="1" step="1" value={draft.durationDays} onChange={(event) => update("durationDays", event.target.value)} placeholder="Ex.: 100"/></label>
              <label className="field"><span>Nível</span><input className="input" value={draft.level} onChange={(event) => update("level", event.target.value)} placeholder="Essencial, forte..."/></label>
              <label className="field"><span>Categoria de vendas</span><input className="input" value={draft.salesCategory} onChange={(event) => update("salesCategory", event.target.value)} placeholder="A, B, C..."/></label>
            </div>
            <label className="field"><span>Informativo</span><textarea className="textarea" rows={3} value={draft.information} onChange={(event) => update("information", event.target.value)}/></label>
            <label className="field"><span>Mensagem rápida</span><textarea className="textarea" rows={3} value={draft.quickMessage} onChange={(event) => update("quickMessage", event.target.value)}/></label>
            <label className="field"><span>Palavras-chave</span><input className="input" value={draft.keywords} onChange={(event) => update("keywords", event.target.value)} placeholder="Separe por vírgulas"/></label>
          </div>
        </article>
      </div>

      <aside className="product-editor-side">
        <article className="panel">
          <div className="panel-head"><div><h2>Disponibilidade</h2><p>Controle como o produto aparece e pode ser usado.</p></div><ShieldCheck size={20}/></div>
          <div className="panel-body product-switch-list">
            <label className="switch-row"><div><strong>Produto ativo</strong><span>Disponível para vendas, estoque e catálogo.</span></div><input type="checkbox" checked={draft.active} onChange={(event) => update("active", event.target.checked)}/></label>
            <label className="switch-row"><div><strong>Produto restrito</strong><span>Identifica itens que exigem atenção especial.</span></div><input type="checkbox" checked={draft.restricted} onChange={(event) => update("restricted", event.target.checked)}/></label>
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
              {flavorMode && <div><dt>Sabores</dt><dd>{activeFlavors.length}</dd></div>}
            </dl>
            {message && <p className="form-error visible">{message}</p>}
            <button className="button gold product-save-button" disabled={loading || flavorLoading} type="submit">{loading ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} {loading ? "Salvando" : isEditing ? "Salvar alterações" : "Cadastrar produto"}</button>
            <Link className="button ghost product-cancel-button" href={product ? `/produtos/${product.id}` : "/produtos"}>Cancelar</Link>
          </div>
        </article>
      </aside>
    </form>
  );
}
