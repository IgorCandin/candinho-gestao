"use client";

import Link from "next/link";
import { CircleDollarSign, FileText, Gift, Layers3, LoaderCircle, PackageCheck, PackagePlus, Percent, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CustomerCombobox } from "@/components/customer-combobox";
import { formatCurrency } from "@/lib/format";
import type { CustomerOption, LocationOption, PartnerOption, ProductComboSaleOption, QuoteDraft, SaleStockOption } from "@/lib/types";

const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Link de Pagamento", "Pagamento fracionado"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
type PaymentMode = "receivable" | "paid" | "combined";
type SaveMode = "confirmed" | "quote";
type DraftItem = { key: string; productId: string; quantity: string; unitPrice: string };

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function itemKey() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`; }
function priceCondition(price: number, cost: number, standard: number) {
  if (price === cost) return "Custo";
  if (price === standard) return "Preço normal";
  if (price < standard) return "Desconto";
  return "Preço combinado";
}

export function NewSaleForm({ customers, locations, partners, stock, combos, initialQuote = null }: {
  customers: CustomerOption[];
  locations: LocationOption[];
  partners: PartnerOption[];
  stock: SaleStockOption[];
  combos: ProductComboSaleOption[];
  initialQuote?: QuoteDraft | null;
}) {
  const router = useRouter();
  const today = todayInSaoPaulo();
  const defaultLocation = initialQuote?.location_id ?? locations.find((location) => location.code === "CS")?.id ?? locations[0]?.id ?? "";
  const initialPaymentMethod = PAYMENT_METHODS.includes(initialQuote?.payment_method as PaymentMethod) ? initialQuote?.payment_method as PaymentMethod : "Pix";
  const [customerId, setCustomerId] = useState(initialQuote?.customer_id ?? "");
  const [locationId, setLocationId] = useState(defaultLocation);
  const [quotedOn, setQuotedOn] = useState(initialQuote?.quoted_on ?? today);
  const [validUntil, setValidUntil] = useState(initialQuote?.valid_until ?? addDays(today, 7));
  const [items, setItems] = useState<DraftItem[]>(initialQuote?.items.length ? initialQuote.items.map((item) => ({ key: itemKey(), productId: item.product_id, quantity: String(item.quantity), unitPrice: String(item.unit_price) })) : [{ key: itemKey(), productId: "", quantity: "1", unitPrice: "" }]);
  const [discount, setDiscount] = useState(initialQuote ? String(initialQuote.discount_amount) : "0");
  const [giftProductId, setGiftProductId] = useState(initialQuote?.gift_product_id ?? "");
  const [giftQuantity, setGiftQuantity] = useState(initialQuote?.gift_quantity ? String(initialQuote.gift_quantity) : "1");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialQuote?.payment_mode ?? "receivable");
  const [paidOn, setPaidOn] = useState(initialQuote?.paid_on ?? today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [paymentDueOn, setPaymentDueOn] = useState(initialQuote?.payment_due_on ?? today);
  const [delivered, setDelivered] = useState(initialQuote?.delivered ?? false);
  const [deliveredOn, setDeliveredOn] = useState(initialQuote?.delivered_on ?? today);
  const [deliveryDueOn, setDeliveryDueOn] = useState(initialQuote?.delivery_due_on ?? today);
  const [schedulePostSale, setSchedulePostSale] = useState(initialQuote?.schedule_post_sale ?? true);
  const [postSaleDueOn, setPostSaleDueOn] = useState(initialQuote?.post_sale_due_on ?? addDays(today, 7));
  const [partnership, setPartnership] = useState(Boolean(initialQuote?.partner_id));
  const [partnerId, setPartnerId] = useState(initialQuote?.partner_id ?? "");
  const [notes, setNotes] = useState(initialQuote?.notes ?? "");
  const [comboId, setComboId] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [loadingMode, setLoadingMode] = useState<SaveMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const productOptions = useMemo(() => {
    const map = new Map<string, SaleStockOption>();
    stock.forEach((row) => { if (!map.has(row.product_id)) map.set(row.product_id, row); });
    return [...map.values()].sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR"));
  }, [stock]);

  function rowFor(productId: string) { return stock.find((row) => row.product_id === productId && row.location_id === locationId) ?? null; }
  function updateItem(key: string, changes: Partial<DraftItem>) { setItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item)); }
  function selectProduct(key: string, productId: string) {
    const row = rowFor(productId) ?? stock.find((entry) => entry.product_id === productId);
    updateItem(key, { productId, unitPrice: row ? String(row.sale_price) : "" });
  }
  function addItem() { setItems((current) => [...current, { key: itemKey(), productId: "", quantity: "1", unitPrice: "" }]); }
  function removeItem(key: string) { setItems((current) => current.length === 1 ? current : current.filter((item) => item.key !== key)); }

  function addCombo() {
    const combo = combos.find((row) => row.id === comboId);
    if (!combo) return;
    let retailTotal = 0;
    setItems((current) => {
      const next = [...current];
      for (const component of combo.items) {
        const row = rowFor(component.product_id) ?? stock.find((entry) => entry.product_id === component.product_id);
        const standardPrice = Number(row?.sale_price ?? 0);
        retailTotal += standardPrice * component.quantity;
        const existing = next.find((item) => item.productId === component.product_id);
        if (existing) {
          existing.quantity = String((Number(existing.quantity) || 0) + component.quantity);
          if (!existing.unitPrice && row) existing.unitPrice = String(row.sale_price);
        } else {
          next.push({ key: itemKey(), productId: component.product_id, quantity: String(component.quantity), unitPrice: row ? String(row.sale_price) : "0" });
        }
      }
      return next.filter((item, index) => !(index === 0 && !item.productId && next.length > 1));
    });
    const comboDiscount = Math.max(retailTotal - combo.sale_price, 0);
    if (comboDiscount > 0) setDiscount((current) => String((Number(current) || 0) + comboDiscount));
    setMessage(`Combo ${combo.name} aplicado ao orçamento${comboDiscount > 0 ? ` com ${formatCurrency(comboDiscount)} de desconto automático` : ""}.`);
    setComboId("");
  }

  const grossTotal = items.reduce((sum, item) => sum + Math.max(Number(item.quantity) || 0, 0) * Math.max(Number(item.unitPrice) || 0, 0), 0);
  const discountValue = Math.max(Number(discount) || 0, 0);
  const finalTotal = Math.max(grossTotal - discountValue, 0);
  const giftRow = giftProductId ? rowFor(giftProductId) ?? stock.find((row) => row.product_id === giftProductId) ?? null : null;

  function validate() {
    if (!customerId || !locationId) throw new Error("Selecione o cliente e o estoque de origem.");
    if (items.some((item) => !item.productId || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0)) throw new Error("Revise os produtos, quantidades e preços.");
    if (new Set(items.map((item) => item.productId)).size !== items.length) throw new Error("O mesmo produto não pode aparecer duas vezes.");
    if (discountValue > grossTotal) throw new Error("O desconto não pode ser maior que o subtotal do orçamento.");
    if (giftProductId && Number(giftQuantity) <= 0) throw new Error("Informe uma quantidade válida para o brinde.");
    if (partnership && !partnerId) throw new Error("Selecione o parceiro deste orçamento.");
  }

  function requestSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      validate();
      setChoiceOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revise os dados do orçamento.");
    }
  }

  async function persist(mode: SaveMode) {
    setLoadingMode(mode);
    setMessage(null);
    try {
      validate();
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_budget", {
        p_mode: mode,
        p_customer_id: customerId,
        p_location_id: locationId,
        p_quoted_on: quotedOn,
        p_valid_until: validUntil,
        p_items: items.map((item) => ({ product_id: item.productId, quantity: Number(item.quantity), unit_price: Number(item.unitPrice) })),
        p_discount_amount: discountValue,
        p_gift_product_id: giftProductId || null,
        p_gift_quantity: giftProductId ? Number(giftQuantity) : 0,
        p_payment_mode: paymentMode,
        p_paid_on: paymentMode === "paid" ? paidOn : null,
        p_payment_method: paymentMethod,
        p_payment_due_on: paymentMode === "combined" ? paymentDueOn : null,
        p_delivered: mode === "confirmed" ? delivered : false,
        p_delivered_on: mode === "confirmed" && delivered ? deliveredOn : null,
        p_delivery_due_on: mode === "confirmed" && !delivered ? deliveryDueOn || null : null,
        p_schedule_post_sale: mode === "confirmed" ? schedulePostSale : false,
        p_post_sale_due_on: mode === "confirmed" && schedulePostSale ? postSaleDueOn : null,
        p_notes: notes.trim() || null,
        p_partner_id: partnership ? partnerId : null,
        p_existing_quote_id: initialQuote?.id ?? null,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const quoteId = String(result?.quote_id ?? "");
      const saleId = result?.sale_id ? String(result.sale_id) : null;
      const leadId = result?.lead_id ? String(result.lead_id) : null;
      if (!quoteId) throw new Error("O orçamento foi salvo, mas não foi possível identificar o PDF.");

      if (mode === "confirmed" && saleId) {
        if (!delivered && deliveryDueOn) {
          const { error: deliveryScheduleError } = await supabase.rpc("reschedule_operational_event", {
            p_source_type: "sale_delivery",
            p_source_id: saleId,
            p_due_at: new Date(`${deliveryDueOn}T12:00:00-03:00`).toISOString(),
          });
          if (deliveryScheduleError) throw deliveryScheduleError;
        }
        if (schedulePostSale && postSaleDueOn) {
          const { error: postSaleScheduleError } = await supabase.rpc("reschedule_operational_event", {
            p_source_type: "sale_post_sale",
            p_source_id: saleId,
            p_due_at: new Date(`${postSaleDueOn}T12:00:00-03:00`).toISOString(),
          });
          if (postSaleScheduleError) throw postSaleScheduleError;
        }
      }

      window.open(`/api/orcamentos/${quoteId}/pdf`, "_blank", "noopener,noreferrer");
      setChoiceOpen(false);
      router.push(mode === "confirmed" && saleId ? `/vendas/${saleId}` : leadId ? `/leads/${leadId}` : "/leads");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o orçamento.");
      setChoiceOpen(false);
    } finally {
      setLoadingMode(null);
    }
  }

  return <form className="new-sale-layout" onSubmit={requestSave}>
    <div className="new-sale-main">
      {initialQuote && <article className="panel budget-conversion-banner"><div className="panel-body"><FileText size={20}/><div><strong>Orçamento #{initialQuote.quote_number}</strong><span>Você está revisando uma cotação salva. Ao confirmar, ela vira venda sem cadastrar os produtos novamente.</span></div></div></article>}

      <article className="panel">
        <div className="panel-head"><div><h2>Cliente e orçamento</h2><p>Dados principais da proposta comercial.</p></div><CircleDollarSign size={20}/></div>
        <div className="panel-body form-grid-two">
          <label className="field"><span>Cliente</span><CustomerCombobox customers={customers} value={customerId} onChange={setCustomerId}/><small>Digite para buscar por nome, cidade ou telefone. Cliente novo? <Link className="inline-link" href="/clientes/novo">Cadastrar cliente</Link></small></label>
          <label className="field"><span>Data do orçamento</span><input className="input" type="date" required value={quotedOn} onChange={(event)=>{setQuotedOn(event.target.value);if(!initialQuote)setValidUntil(addDays(event.target.value,7));}}/></label>
          <label className="field"><span>Validade do orçamento</span><input className="input" type="date" min={quotedOn} required value={validUntil} onChange={(event)=>setValidUntil(event.target.value)}/></label>
          <label className="field"><span>Estoque / depósito de origem</span><select className="select" required value={locationId} onChange={(event)=>setLocationId(event.target.value)}>{locations.map((location)=><option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select></label>
          <div className="field field-span-two"><small><strong>Apenas orçando:</strong> não reserva nem baixa estoque. <strong>Orçamento confirmado:</strong> cria a venda normal; itens ficam reservados até a entrega e o brinde é baixado imediatamente.</small></div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Produtos</h2><p>Monte a proposta com quantidade e valor negociado de cada item.</p></div><button className="button ghost compact-button" type="button" onClick={addItem}><Plus size={16}/>Adicionar produto</button></div>
        <div className="panel-body sale-form-items">
          {combos.length>0&&<div className="budget-combo-picker"><Layers3 size={18}/><div><strong>Adicionar combo pronto</strong><span>Insere os produtos reais do combo e aplica o desconto comercial automaticamente.</span></div><select className="select" value={comboId} onChange={(event)=>setComboId(event.target.value)}><option value="">Selecione um combo</option>{combos.map((combo)=><option key={combo.id} value={combo.id}>{combo.name} · {formatCurrency(combo.sale_price)}</option>)}</select><button className="button ghost compact-button" type="button" disabled={!comboId} onClick={addCombo}><Plus size={15}/>Aplicar</button></div>}
          {items.map((item, index) => {
            const row = rowFor(item.productId);
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const condition = row ? priceCondition(unitPrice, row.cost_price, row.sale_price) : null;
            return <div className="sale-form-item" key={item.key}>
              <div className="sale-form-item-head"><strong>Item {index + 1}</strong>{items.length > 1 && <button className="icon-button" type="button" aria-label="Remover produto" onClick={()=>removeItem(item.key)}><Trash2 size={16}/></button>}</div>
              <div className="sale-form-item-grid">
                <label className="field sale-product-field"><span>Produto</span><select className="select" required value={item.productId} onChange={(event)=>selectProduct(item.key,event.target.value)}><option value="">Selecione o produto</option>{productOptions.map((product)=><option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}</select></label>
                <label className="field"><span>Quantidade</span><input className="input" type="number" min="1" step="1" required value={item.quantity} onChange={(event)=>updateItem(item.key,{quantity:event.target.value})}/></label>
                <label className="field"><span>Preço de venda</span><input className="input" type="number" min="0" step="0.01" required value={item.unitPrice} onChange={(event)=>updateItem(item.key,{unitPrice:event.target.value})}/></label>
              </div>
              {row && <div className="sale-stock-strip">
                <span>Custo <strong>{formatCurrency(row.cost_price)}</strong></span>
                <span>Preço padrão <strong>{formatCurrency(row.sale_price)}</strong></span>
                <span>Físico <strong>{row.physical_quantity}</strong></span>
                <span>Reservado <strong>{row.reserved_quantity}</strong></span>
                <span>Disponível <strong className={row.available_quantity >= quantity ? "positive" : "warning-text"}>{row.available_quantity}</strong></span>
                <span>Condição <strong>{condition}</strong></span>
                <span>Subtotal <strong>{formatCurrency(quantity * unitPrice)}</strong></span>
              </div>}
            </div>;
          })}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Desconto e brinde</h2><p>O desconto é aplicado no total. O brinde só movimenta estoque quando o orçamento é confirmado.</p></div><Gift size={20}/></div>
        <div className="panel-body form-grid-two">
          <label className="field"><span><Percent size={14}/> Desconto total (R$)</span><input className="input" type="number" min="0" max={grossTotal} step="0.01" value={discount} onChange={(event)=>setDiscount(event.target.value)}/><small>Subtotal atual: {formatCurrency(grossTotal)}</small></label>
          <label className="field"><span><Gift size={14}/> Produto de brinde</span><select className="select" value={giftProductId} onChange={(event)=>{setGiftProductId(event.target.value);if(event.target.value&&!giftQuantity)setGiftQuantity("1");}}><option value="">Sem brinde</option>{productOptions.map((product)=><option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}</select></label>
          {giftProductId && <label className="field"><span>Quantidade do brinde</span><input className="input" type="number" min="1" step="1" value={giftQuantity} onChange={(event)=>setGiftQuantity(event.target.value)}/>{giftRow&&<small>Disponível em {giftRow.location_code}: {giftRow.available_quantity} un.</small>}</label>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Observações</h2><p>Informações que também podem aparecer no PDF enviado ao cliente.</p></div></div>
        <div className="panel-body"><label className="field"><span>Observações do orçamento</span><textarea className="textarea" rows={5} value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder="Ex.: condição especial, prazo, retirada, combinação com o cliente..."/></label></div>
      </article>
    </div>

    <aside className="new-sale-side">
      <article className="panel">
        <div className="panel-head"><div><h2>Pagamento</h2><p>Condição proposta para este orçamento.</p></div></div>
        <div className="panel-body option-stack">
          <label className={`choice-card ${paymentMode==="receivable"?"active":""}`}><input type="radio" name="paymentMode" checked={paymentMode==="receivable"} onChange={()=>setPaymentMode("receivable")}/><span><strong>A receber</strong><small>Sem data combinada.</small></span></label>
          <label className={`choice-card ${paymentMode==="paid"?"active":""}`}><input type="radio" name="paymentMode" checked={paymentMode==="paid"} onChange={()=>setPaymentMode("paid")}/><span><strong>Pago</strong><small>Ao confirmar a venda, registra o recebimento.</small></span></label>
          <label className={`choice-card ${paymentMode==="combined"?"active":""}`}><input type="radio" name="paymentMode" checked={paymentMode==="combined"} onChange={()=>setPaymentMode("combined")}/><span><strong>Pagamento combinado</strong><small>Define uma data acordada.</small></span></label>
          <div className="conditional-fields"><label className="field"><span>Forma de pagamento</span><select className="select" value={paymentMethod} onChange={(event)=>setPaymentMethod(event.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((method)=><option key={method}>{method}</option>)}</select></label></div>
          {paymentMode === "paid" && <div className="conditional-fields"><label className="field"><span>Data do pagamento</span><input className="input" type="date" required value={paidOn} onChange={(event)=>setPaidOn(event.target.value)}/></label></div>}
          {paymentMode === "combined" && <div className="conditional-fields"><label className="field"><span>Data combinada</span><input className="input" type="date" required value={paymentDueOn} onChange={(event)=>setPaymentDueOn(event.target.value)}/></label></div>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Entrega</h2><p>Usado somente se escolher Orçamento confirmado.</p></div></div>
        <div className="panel-body option-stack">
          <label className={`choice-card ${delivered?"active":""}`}><input type="checkbox" checked={delivered} onChange={(event)=>setDelivered(event.target.checked)}/><span><strong>Já foi entregue</strong><small>Ao confirmar, baixa o estoque dos produtos.</small></span></label>
          {delivered ? <div className="conditional-fields"><label className="field"><span>Data da entrega</span><input className="input" type="date" required value={deliveredOn} onChange={(event)=>setDeliveredOn(event.target.value)}/></label></div> : <div className="conditional-fields"><label className="field"><span>Entrega prevista</span><input className="input" type="date" value={deliveryDueOn} onChange={(event)=>setDeliveryDueOn(event.target.value)}/><small>Na confirmação, a venda aparecerá na Agenda.</small></label></div>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Pós-venda</h2><p>Agendado apenas quando o orçamento for confirmado.</p></div></div>
        <div className="panel-body option-stack">
          <label className={`choice-card ${schedulePostSale?"active":""}`}><input type="checkbox" checked={schedulePostSale} onChange={(event)=>setSchedulePostSale(event.target.checked)}/><span><strong>Agendar pós-venda</strong><small>Lembrete vinculado ao cliente e à venda.</small></span></label>
          {schedulePostSale && <div className="conditional-fields"><label className="field"><span>Data do pós-venda</span><input className="input" type="date" required value={postSaleDueOn} onChange={(event)=>setPostSaleDueOn(event.target.value)}/></label></div>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><h2>Parceria</h2><p>Pode ser mantida ao converter o orçamento em venda.</p></div></div>
        <div className="panel-body option-stack">
          <label className={`choice-card ${partnership?"active":""}`}><input type="checkbox" checked={partnership} onChange={(event)=>setPartnership(event.target.checked)}/><span><strong>Elegível à parceria</strong><small>Contabiliza a venda confirmada para o parceiro.</small></span></label>
          {partnership && <div className="conditional-fields"><label className="field"><span>Parceiro</span><select className="select" required value={partnerId} onChange={(event)=>setPartnerId(event.target.value)}><option value="">Selecione o parceiro</option>{partners.map((partner)=><option key={partner.id} value={partner.id}>{partner.name} · {partner.partner_type}</option>)}</select></label></div>}
        </div>
      </article>

      <article className="panel sale-form-summary budget-summary">
        <PackagePlus size={22}/><div><span>Subtotal</span><strong>{formatCurrency(grossTotal)}</strong>{discountValue>0&&<small>Desconto: -{formatCurrency(discountValue)}</small>}<span className="budget-final-label">Total final</span><strong className="budget-final-value">{formatCurrency(finalTotal)}</strong><small>{items.length} {items.length===1?"produto":"produtos"}{giftProductId?" + brinde":""}</small></div>
      </article>
      <div className="sale-form-actions"><Link className="button ghost" href="/vendas">Cancelar</Link><button className="button gold" type="submit" disabled={Boolean(loadingMode)}>{loadingMode?<LoaderCircle className="spin" size={17}/>:<Save size={17}/>} {loadingMode?"Salvando":"Salvar orçamento"}</button></div>
      {message && <p className="form-message standalone-message">{message}</p>}
    </aside>

    {choiceOpen && <div className="budget-choice-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!loadingMode)setChoiceOpen(false)}}>
      <section className="budget-choice-modal" role="dialog" aria-modal="true" aria-labelledby="budget-choice-title">
        <button className="budget-choice-close" type="button" aria-label="Fechar" disabled={Boolean(loadingMode)} onClick={()=>setChoiceOpen(false)}><X size={18}/></button>
        <div className="budget-choice-heading"><FileText size={25}/><div><span>Salvar orçamento</span><h2 id="budget-choice-title">O cliente já confirmou?</h2><p>Escolha o destino. O PDF é gerado nos dois casos.</p></div></div>
        <div className="budget-choice-grid">
          <button className="budget-choice-card confirmed" type="button" disabled={Boolean(loadingMode)} onClick={()=>persist("confirmed")}><PackageCheck size={25}/><span><strong>Orçamento confirmado</strong><small>Cria a venda normal, aplica desconto, registra o brinde e movimenta o estoque conforme a entrega.</small></span>{loadingMode==="confirmed"&&<LoaderCircle className="spin" size={18}/>}</button>
          <button className="budget-choice-card quote" type="button" disabled={Boolean(loadingMode)} onClick={()=>persist("quote")}><FileText size={25}/><span><strong>Apenas orçando</strong><small>Não mexe no estoque. Gera o PDF e salva cliente + todos os produtos na aba Leads.</small></span>{loadingMode==="quote"&&<LoaderCircle className="spin" size={18}/>}</button>
        </div>
      </section>
    </div>}
  </form>;
}
