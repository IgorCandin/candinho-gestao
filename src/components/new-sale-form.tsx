"use client";

import Link from "next/link";
import {
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Gift,
  Layers3,
  LoaderCircle,
  PackageCheck,
  PackagePlus,
  Percent,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CustomerCombobox } from "@/components/customer-combobox";
import { SaleProductComboboxV45234 } from "@/components/sale-product-combobox-v45-23-4";
import {
  createEqualInstallments,
  PaymentInstallmentEditor,
  type PaymentInstallmentDraft,
} from "@/components/payment-installment-editor";
import { formatCurrency } from "@/lib/format";
import { DELIVERY_FINALIZATION_INTENT_KEY } from "@/lib/delivery-finalization-intent";
import type {
  CustomerOption,
  LocationOption,
  PartnerOption,
  ProductComboSaleOption,
  QuoteDraft,
  SaleStockOption,
} from "@/lib/types";

const PAYMENT_METHODS = [
  "Pix",
  "Dinheiro",
  "Cartão",
  "Link de Pagamento",
  "Pagamento fracionado",
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];
type PaymentMode = "receivable" | "paid" | "combined" | "split";
type SaveMode = "confirmed" | "quote";
type DraftItem = {
  key: string;
  productId: string;
  flavorId: string;
  quantity: string;
  unitPrice: string;
};
type SavedBudgetPrompt = {
  quoteId: string;
  target: string;
  mode: SaveMode;
};
type FlavorOption = { id: string; productId: string; name: string };
type FlavorStock = {
  flavorId: string;
  locationId: string;
  physical: number;
  reserved: number;
  available: number;
  incoming: number;
};

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function itemKey() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  );
}

function priceCondition(price: number, cost: number, standard: number) {
  if (price === cost) return "Custo";
  if (price === standard) return "Preço normal";
  if (price < standard) return "Desconto";
  return "Preço combinado";
}

function cents(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100);
}

export function NewSaleForm({
  customers,
  locations,
  partners,
  stock,
  combos,
  lastPurchaseCosts,
  initialQuote = null,
}: {
  customers: CustomerOption[];
  locations: LocationOption[];
  partners: PartnerOption[];
  stock: SaleStockOption[];
  combos: ProductComboSaleOption[];
  lastPurchaseCosts: Record<string, { cost: number | null; purchasedOn: string | null }>;
  initialQuote?: QuoteDraft | null;
}) {
  const router = useRouter();
  const today = todayInSaoPaulo();

  const defaultLocation =
    initialQuote?.location_id ??
    locations.find((location) => location.code === "CS")?.id ??
    locations[0]?.id ??
    "";

  const initialPaymentMethod = PAYMENT_METHODS.includes(
    initialQuote?.payment_method as PaymentMethod,
  )
    ? (initialQuote?.payment_method as PaymentMethod)
    : "Pix";

  const initialMode = (
    ["receivable", "paid", "combined", "split"] as PaymentMode[]
  ).includes(String(initialQuote?.payment_mode) as PaymentMode)
    ? (String(initialQuote?.payment_mode) as PaymentMode)
    : "receivable";

  const [customerId, setCustomerId] = useState(
    initialQuote?.customer_id ?? "",
  );
  const [locationId, setLocationId] = useState(defaultLocation);
  const [quotedOn, setQuotedOn] = useState(
    initialQuote?.quoted_on ?? today,
  );
  const [validUntil, setValidUntil] = useState(
    initialQuote?.valid_until ?? addDays(today, 7),
  );

  const [items, setItems] = useState<DraftItem[]>(
    initialQuote?.items.length
      ? initialQuote.items.map((item) => ({
          key: itemKey(),
          productId: item.product_id,
          flavorId: "",
          quantity: String(item.quantity),
          unitPrice: String(item.unit_price),
        }))
      : [],
  );

  const [discount, setDiscount] = useState(
    initialQuote ? String(initialQuote.discount_amount) : "0",
  );
  const [agreedMarkup, setAgreedMarkup] = useState("0");
  const [giftProductId, setGiftProductId] = useState(
    initialQuote?.gift_product_id ?? "",
  );
  const [giftQuantity, setGiftQuantity] = useState(
    initialQuote?.gift_quantity
      ? String(initialQuote.gift_quantity)
      : "1",
  );

  const [paymentMode, setPaymentMode] =
    useState<PaymentMode>(initialMode);
  const [paidOn, setPaidOn] = useState(
    initialQuote?.paid_on ?? today,
  );
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(initialPaymentMethod);
  const [paymentDueOn, setPaymentDueOn] = useState(
    initialQuote?.payment_due_on ?? today,
  );
  const [paymentInstallments, setPaymentInstallments] = useState<
    PaymentInstallmentDraft[]
  >([]);

  const [delivered, setDelivered] = useState(
    initialQuote?.delivered ?? false,
  );
  const [deliveredOn, setDeliveredOn] = useState(
    initialQuote?.delivered_on ?? today,
  );
  const [deliveryDueOn, setDeliveryDueOn] = useState(
    initialQuote?.delivery_due_on ?? today,
  );
  const [schedulePostSale, setSchedulePostSale] = useState(
    initialQuote?.schedule_post_sale ?? true,
  );
  const [postSaleDueOn, setPostSaleDueOn] = useState(
    initialQuote?.post_sale_due_on ?? addDays(today, 7),
  );
  const [partnership, setPartnership] = useState(
    Boolean(initialQuote?.partner_id),
  );
  const [partnerId, setPartnerId] = useState(
    initialQuote?.partner_id ?? "",
  );
  const [notes, setNotes] = useState(initialQuote?.notes ?? "");
  const [comboId, setComboId] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [quoteFinalizeOpen, setQuoteFinalizeOpen] = useState(false);
  const [loadingMode, setLoadingMode] = useState<SaveMode | null>(null);
  const [savedBudgetPrompt, setSavedBudgetPrompt] =
    useState<SavedBudgetPrompt | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [flavors, setFlavors] = useState<FlavorOption[]>([]);
  const [flavorStock, setFlavorStock] = useState<FlavorStock[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAutomaticPartner() {
      if (!customerId) {
        if (!initialQuote) {
          setPartnership(false);
          setPartnerId("");
        }
        return;
      }

      if (
        initialQuote?.customer_id === customerId &&
        initialQuote.partner_id
      ) {
        setPartnership(true);
        setPartnerId(initialQuote.partner_id);
        return;
      }

      try {
        const response = await fetch(
          `/api/customers/${customerId}/relationships?compact=1`,
          { cache: "no-store" },
        );

        if (!response.ok || cancelled) return;

        const payload = (await response.json()) as {
          network?: {
            autoPartner?: {
              partner_id?: string | null;
            } | null;
          };
        };

        if (cancelled) return;

        const automaticPartner =
          payload.network?.autoPartner?.partner_id ?? "";

        if (automaticPartner) {
          setPartnership(true);
          setPartnerId(automaticPartner);
        } else {
          setPartnership(false);
          setPartnerId("");
        }
      } catch {
        if (!cancelled && !initialQuote) {
          setPartnership(false);
          setPartnerId("");
        }
      }
    }

    void loadAutomaticPartner();

    return () => {
      cancelled = true;
    };
  }, [
    customerId,
    initialQuote?.customer_id,
    initialQuote?.partner_id,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadFlavorsAndQuotePayment() {
      const supabase = createClient();

      const [flavorResult, stockResult, quoteItemsResult] =
        await Promise.all([
          supabase
            .from("product_flavors")
            .select("id,product_id,name")
            .eq("active", true)
            .order("display_order")
            .order("name"),
          supabase
            .from("product_flavor_inventory_overview")
            .select(
              "flavor_id,location_id,physical_quantity,reserved_quantity,available_quantity,incoming_quantity",
            ),
          initialQuote
            ? supabase
                .from("sales_quote_items")
                .select(
                  "product_id,flavor_id,quantity,unit_price,created_at",
                )
                .eq("quote_id", initialQuote.id)
                .order("created_at")
            : Promise.resolve({ data: null, error: null }),
        ]);

      if (cancelled) return;

      const error =
        flavorResult.error ||
        stockResult.error ||
        quoteItemsResult.error;

      if (error) {
        setMessage(error.message);
        return;
      }

      setFlavors(
        (flavorResult.data ?? []).map((row) => ({
          id: String(row.id),
          productId: String(row.product_id),
          name: String(row.name ?? ""),
        })),
      );

      setFlavorStock(
        (stockResult.data ?? []).map((row) => ({
          flavorId: String(row.flavor_id),
          locationId: String(row.location_id),
          physical: Number(row.physical_quantity ?? 0),
          reserved: Number(row.reserved_quantity ?? 0),
          available: Number(row.available_quantity ?? 0),
          incoming: Number(row.incoming_quantity ?? 0),
        })),
      );

      if (initialQuote && quoteItemsResult.data?.length) {
        setItems(
          quoteItemsResult.data.map((row) => ({
            key: itemKey(),
            productId: String(row.product_id),
            flavorId:
              typeof row.flavor_id === "string" ? row.flavor_id : "",
            quantity: String(row.quantity),
            unitPrice: String(row.unit_price),
          })),
        );
      }

      if (initialQuote) {
        const [quotePaymentResult, planResult] = await Promise.all([
          supabase
            .from("sales_quotes")
            .select("payment_mode,agreed_markup_amount")
            .eq("id", initialQuote.id)
            .maybeSingle(),
          supabase
            .from("sales_quote_payment_installments")
            .select(
              "id,installment_no,amount,due_on,planned_payment_method,notes",
            )
            .eq("quote_id", initialQuote.id)
            .order("installment_no"),
        ]);

        if (cancelled) return;

        if (quotePaymentResult.error) {
          setMessage(quotePaymentResult.error.message);
          return;
        }

        if (planResult.error) {
          setMessage(planResult.error.message);
          return;
        }

        setAgreedMarkup(
          Number(quotePaymentResult.data?.agreed_markup_amount ?? 0).toFixed(2),
        );

        if (quotePaymentResult.data?.payment_mode === "split") {
          setPaymentMode("split");
          setPaymentInstallments(
            (planResult.data ?? []).map((row) => ({
              key: String(row.id),
              amount: Number(row.amount ?? 0).toFixed(2),
              dueOn: String(row.due_on ?? today),
              plannedPaymentMethod:
                typeof row.planned_payment_method === "string"
                  ? row.planned_payment_method
                  : "",
              notes:
                typeof row.notes === "string" ? row.notes : "",
            })),
          );
        }
      }
    }

    void loadFlavorsAndQuotePayment();

    return () => {
      cancelled = true;
    };
  }, [initialQuote, today]);

  const productOptions = useMemo(() => {
    const map = new Map<string, SaleStockOption>();

    stock.forEach((row) => {
      if (!map.has(row.product_id)) map.set(row.product_id, row);
    });

    return [...map.values()].sort((a, b) =>
      a.product_name.localeCompare(b.product_name, "pt-BR"),
    );
  }, [stock]);

  const searchableProductOptions = useMemo(() => {
    const location =
      locations.find((row) => row.id === locationId) ?? null;

    return productOptions.map((product) => {
      const localStock = stock.find(
        (row) =>
          row.product_id === product.product_id &&
          row.location_id === locationId,
      );

      return {
        id: product.product_id,
        name: product.product_name,
        category: product.category,
        brand: product.brand,
        available: Number(localStock?.available_quantity ?? 0),
        physical: Number(localStock?.physical_quantity ?? 0),
        locationCode:
          localStock?.location_code ??
          location?.code ??
          "—",
      };
    });
  }, [locationId, locations, productOptions, stock]);

  function rowFor(productId: string) {
    return (
      stock.find(
        (row) =>
          row.product_id === productId &&
          row.location_id === locationId,
      ) ??
      stock.find((entry) => entry.product_id === productId) ??
      null
    );
  }

  function flavorsFor(productId: string) {
    return flavors.filter((flavor) => flavor.productId === productId);
  }

  function flavorStockFor(flavorId: string) {
    return (
      flavorStock.find(
        (row) =>
          row.flavorId === flavorId &&
          row.locationId === locationId,
      ) ?? null
    );
  }

  function updateItem(key: string, changes: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) =>
        item.key === key ? { ...item, ...changes } : item,
      ),
    );
  }

  function selectProduct(key: string, productId: string) {
    const row =
      rowFor(productId) ??
      stock.find((entry) => entry.product_id === productId);

    updateItem(key, {
      productId,
      flavorId: "",
      unitPrice: row ? String(row.sale_price) : "",
    });
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        key: itemKey(),
        productId: "",
        flavorId: "",
        quantity: "1",
        unitPrice: "",
      },
    ]);
  }

  function removeItem(key: string) {
    setItems((current) =>
      current.filter((item) => item.key !== key),
    );
  }

  function addCombo() {
    const combo = combos.find((row) => row.id === comboId);
    if (!combo) return;

    let retailTotal = 0;

    setItems((current) => {
      const next = [...current];

      for (const component of combo.items) {
        const row =
          rowFor(component.product_id) ??
          stock.find(
            (entry) => entry.product_id === component.product_id,
          );

        const standardPrice = Number(row?.sale_price ?? 0);
        retailTotal += standardPrice * component.quantity;

        const hasFlavors =
          flavorsFor(component.product_id).length > 0;

        const existing = hasFlavors
          ? null
          : next.find(
              (item) =>
                item.productId === component.product_id &&
                !item.flavorId,
            );

        if (existing) {
          existing.quantity = String(
            (Number(existing.quantity) || 0) + component.quantity,
          );
          if (!existing.unitPrice && row) {
            existing.unitPrice = String(row.sale_price);
          }
        } else {
          next.push({
            key: itemKey(),
            productId: component.product_id,
            flavorId: "",
            quantity: String(component.quantity),
            unitPrice: row ? String(row.sale_price) : "0",
          });
        }
      }

      return next.filter(
        (item, index) =>
          !(index === 0 && !item.productId && next.length > 1),
      );
    });

    const comboDiscount = Math.max(
      retailTotal - combo.sale_price,
      0,
    );

    if (comboDiscount > 0) {
      setDiscount((current) =>
        String((Number(current) || 0) + comboDiscount),
      );
    }

    setMessage(
      `Combo ${combo.name} aplicado ao orçamento${
        comboDiscount > 0
          ? ` com ${formatCurrency(
              comboDiscount,
            )} de desconto automático`
          : ""
      }.`,
    );

    setComboId("");
  }

  const grossTotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(Number(item.quantity) || 0, 0) *
        Math.max(Number(item.unitPrice) || 0, 0),
    0,
  );

  const discountValue = Math.max(Number(discount) || 0, 0);
  const agreedMarkupValue = Math.max(Number(agreedMarkup) || 0, 0);
  const finalTotal = Math.max(
    grossTotal - discountValue + agreedMarkupValue,
    0,
  );

  const giftRow = giftProductId
    ? rowFor(giftProductId) ??
      stock.find((row) => row.product_id === giftProductId) ??
      null
    : null;

  function selectPaymentMode(mode: PaymentMode) {
    setPaymentMode(mode);

    if (mode === "split" && paymentInstallments.length < 2) {
      setPaymentInstallments(
        createEqualInstallments(finalTotal, 2, today),
      );
    }
  }

  function validate() {
    if (!customerId || !locationId) {
      throw new Error(
        "Selecione o cliente e o estoque de origem.",
      );
    }

    if (items.length === 0) {
      throw new Error("Adicione pelo menos um produto ao orçamento.");
    }

    if (
      items.some(
        (item) =>
          !item.productId ||
          Number(item.quantity) <= 0 ||
          Number(item.unitPrice) < 0,
      )
    ) {
      throw new Error(
        "Revise os produtos, quantidades e preços.",
      );
    }

    for (const item of items) {
      const productFlavors = flavorsFor(item.productId);

      if (productFlavors.length > 0 && !item.flavorId) {
        const row = rowFor(item.productId);
        throw new Error(
          `Selecione o sabor de ${
            row?.product_name ?? "um dos produtos"
          }.`,
        );
      }
    }

    const compositeKeys = items.map(
      (item) =>
        `${item.productId}:${item.flavorId || "sem-sabor"}`,
    );

    if (new Set(compositeKeys).size !== compositeKeys.length) {
      throw new Error(
        "O mesmo produto e sabor não podem aparecer duas vezes.",
      );
    }

    if (discountValue > grossTotal) {
      throw new Error(
        "O desconto não pode ser maior que o subtotal do orçamento.",
      );
    }

    if (giftProductId && Number(giftQuantity) <= 0) {
      throw new Error(
        "Informe uma quantidade válida para o brinde.",
      );
    }

    if (
      giftProductId &&
      flavorsFor(giftProductId).length > 0
    ) {
      throw new Error(
        "Produto com sabores deve ser adicionado como item do orçamento para você escolher o sabor.",
      );
    }

    if (partnership && !partnerId) {
      throw new Error(
        "Selecione o parceiro deste orçamento.",
      );
    }

    if (paymentMode === "split") {
      if (paymentInstallments.length < 2) {
        throw new Error(
          "Pagamento dividido precisa de pelo menos duas parcelas.",
        );
      }

      if (
        paymentInstallments.some(
          (row) =>
            Number(row.amount) <= 0 || !row.dueOn,
        )
      ) {
        throw new Error(
          "Revise o valor e o vencimento de todas as parcelas.",
        );
      }

      const plannedCents = paymentInstallments.reduce(
        (sum, row) =>
          sum + cents(Number(row.amount) || 0),
        0,
      );

      if (plannedCents !== cents(finalTotal)) {
        throw new Error(
          `A soma das parcelas precisa ser igual ao total final de ${formatCurrency(
            finalTotal,
          )}.`,
        );
      }
    }
  }

  function requestSave(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage(null);

    try {
      validate();
      setChoiceOpen(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Revise os dados do orçamento.",
      );
    }
  }

  async function persist(mode: SaveMode) {
    setLoadingMode(mode);
    setMessage(null);

    try {
      validate();

      const supabase = createClient();

      const { data: quoteData, error: quoteError } =
        await supabase.rpc("save_budget_quote_v4", {
          p_customer_id: customerId,
          p_location_id: locationId,
          p_quoted_on: quotedOn,
          p_valid_until: validUntil,
          p_items: items.map((item) => ({
            product_id: item.productId,
            flavor_id: item.flavorId || null,
            quantity: Number(item.quantity),
            unit_price: Number(item.unitPrice),
          })),
          p_discount_amount: discountValue,
          p_gift_product_id: giftProductId || null,
          p_gift_quantity: giftProductId
            ? Number(giftQuantity)
            : 0,
          p_payment_mode: paymentMode,
          p_paid_on:
            paymentMode === "paid" ? paidOn : null,
          p_payment_method:
            paymentMode === "split"
              ? "Pagamento fracionado"
              : paymentMethod,
          p_payment_due_on:
            paymentMode === "combined"
              ? paymentDueOn
              : null,
          p_delivered:
            mode === "confirmed" ? delivered : false,
          p_delivered_on:
            mode === "confirmed" && delivered
              ? deliveredOn
              : null,
          p_delivery_due_on:
            mode === "confirmed" && !delivered
              ? deliveryDueOn || null
              : null,
          p_schedule_post_sale:
            mode === "confirmed"
              ? schedulePostSale
              : false,
          p_post_sale_due_on:
            mode === "confirmed" && schedulePostSale
              ? postSaleDueOn
              : null,
          p_notes: notes.trim() || null,
          p_partner_id: partnership
            ? partnerId
            : null,
          p_existing_quote_id:
            initialQuote?.id ?? null,
          p_payment_installments:
            paymentMode === "split"
              ? paymentInstallments.map((row) => ({
                  amount: Number(row.amount),
                  due_on: row.dueOn,
                  planned_payment_method:
                    row.plannedPaymentMethod || null,
                  notes: row.notes.trim() || null,
                }))
              : [],
          p_agreed_markup_amount: agreedMarkupValue,
        });

      if (quoteError) throw new Error(quoteError.message);

      const saved = Array.isArray(quoteData)
        ? quoteData[0]
        : quoteData;

      const quoteId = String(saved?.quote_id ?? "");

      if (!quoteId) {
        throw new Error(
          "O orçamento foi salvo, mas não foi possível identificar o registro.",
        );
      }

      let saleId: string | null = null;

      if (mode === "confirmed") {
        const {
          data: confirmedSaleId,
          error: confirmError,
        } = await supabase.rpc(
          "confirm_budget_quote_v4",
          {
            p_quote_id: quoteId,
          },
        );

        if (confirmError) throw new Error(confirmError.message);

        saleId = String(confirmedSaleId ?? "");

        if (!saleId) {
          throw new Error(
            "O orçamento foi salvo, mas não foi possível identificar a venda criada.",
          );
        }
      }

      setChoiceOpen(false);
      setQuoteFinalizeOpen(false);

      setSavedBudgetPrompt({
        quoteId,
        target: saleId
          ? `/suplementos/vendas/${saleId}`
          : "/suplementos/vendas",
        mode,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o orçamento.",
      );
      setChoiceOpen(false);
      setQuoteFinalizeOpen(false);
    } finally {
      setLoadingMode(null);
    }
  }

  function finishSavedBudget(openPdf: boolean) {
    if (!savedBudgetPrompt) return;

    const { quoteId, target } =
      savedBudgetPrompt;

    if (openPdf) {
      window.open(
        `/api/orcamentos/${quoteId}/pdf`,
        "_blank",
        "noopener,noreferrer",
      );
    }

    const shouldFinalizeDelivery =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(
        DELIVERY_FINALIZATION_INTENT_KEY,
      ) !== null;

    setSavedBudgetPrompt(null);
    router.push(
      shouldFinalizeDelivery
        ? `${target}?finalizar-entrega=1`
        : target,
    );
    router.refresh();
  }

  return (
    <form className="new-sale-layout" onSubmit={requestSave}>
      <div className="new-sale-main">
        {initialQuote && (
          <article className="panel budget-conversion-banner">
            <div className="panel-body">
              <FileText size={20} />
              <div>
                <strong>
                  Orçamento #{initialQuote.quote_number}
                </strong>
                <span>
                  Você está revisando uma cotação salva. Ao
                  confirmar, ela vira venda sem cadastrar os
                  produtos novamente.
                </span>
              </div>
            </div>
          </article>
        )}

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Cliente e orçamento</h2>
              <p>Dados principais da proposta comercial.</p>
            </div>
            <CircleDollarSign size={20} />
          </div>

          <div className="panel-body form-grid-two">
            <label className="field">
              <span>Cliente</span>
              <CustomerCombobox
                customers={customers}
                value={customerId}
                onChange={setCustomerId}
              />
              <small>
                Digite para buscar por nome, cidade ou telefone.
                Cliente novo?{" "}
                <Link
                  className="inline-link"
                  href="/clientes/novo"
                >
                  Cadastrar cliente
                </Link>
              </small>
            </label>

            <label className="field">
              <span>Data do orçamento</span>
              <input
                className="input"
                type="date"
                required
                value={quotedOn}
                onChange={(event) => {
                  setQuotedOn(event.target.value);

                  if (!initialQuote) {
                    setValidUntil(
                      addDays(event.target.value, 7),
                    );
                  }
                }}
              />
            </label>


          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Produtos</h2>
              <p>
                Primeiro confirme o estoque. Depois pesquise um
                produto pelo nome, marca ou categoria — ou aplique
                um combo pronto.
              </p>
            </div>
          </div>

          <div className="panel-body sale-form-items">
            <div className="v45234-product-setup">
              <label className="field v45234-stock-field">
                <span>Estoque / depósito de origem</span>
                <select
                  className="select"
                  required
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(event.target.value)
                  }
                >
                  {locations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.code} · {location.name}
                    </option>
                  ))}
                </select>
                <small>
                  CS já vem selecionado por padrão. Troque somente
                  quando a venda sair de outro estoque.
                </small>
              </label>

              <div className="v45234-product-actions">
                <button
                  className="button gold v45234-add-product"
                  type="button"
                  onClick={addItem}
                >
                  <Plus size={17} />
                  Selecionar produto
                </button>

                {combos.length > 0 && (
                  <div className="budget-combo-picker v45234-combo-picker">
                    <Layers3 size={18} />
                    <div>
                      <strong>Selecionar combo</strong>
                      <span>
                        Adiciona os produtos e aplica o desconto
                        comercial automaticamente.
                      </span>
                    </div>

                    <select
                      className="select"
                      value={comboId}
                      onChange={(event) =>
                        setComboId(event.target.value)
                      }
                    >
                      <option value="">Selecione um combo</option>
                      {combos.map((combo) => (
                        <option
                          key={combo.id}
                          value={combo.id}
                        >
                          {combo.name} ·{" "}
                          {formatCurrency(combo.sale_price)}
                        </option>
                      ))}
                    </select>

                    <button
                      className="button ghost compact-button"
                      type="button"
                      disabled={!comboId}
                      onClick={addCombo}
                    >
                      <Plus size={15} />
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {items.length === 0 && (
              <div className="v45234-empty-products">
                <PackagePlus size={20} />
                <div>
                  <strong>Nenhum produto selecionado ainda.</strong>
                  <span>
                    Confirme o estoque acima e toque em
                    Selecionar produto.
                  </span>
                </div>
              </div>
            )}

            {items.map((item, index) => {
              const row = rowFor(item.productId);
              const lastPurchaseCost = item.productId
                ? lastPurchaseCosts[item.productId]
                : undefined;
              const lastPurchaseCostDiffers =
                Boolean(
                  row &&
                    lastPurchaseCost?.cost != null &&
                    Math.abs(
                      Number(lastPurchaseCost.cost) -
                        Number(row.cost_price),
                    ) >= 0.01,
                );
              const productFlavors = flavorsFor(
                item.productId,
              );
              const selectedFlavor =
                productFlavors.find(
                  (flavor) =>
                    flavor.id === item.flavorId,
                ) ?? null;
              const selectedFlavorStock = item.flavorId
                ? flavorStockFor(item.flavorId)
                : null;
              const quantity =
                Number(item.quantity) || 0;
              const unitPrice =
                Number(item.unitPrice) || 0;
              const condition = row
                ? priceCondition(
                    unitPrice,
                    row.cost_price,
                    row.sale_price,
                  )
                : null;
              const displayedAvailable =
                selectedFlavorStock
                  ? selectedFlavorStock.available
                  : row?.available_quantity ?? 0;

              return (
                <div
                  className="sale-form-item"
                  key={item.key}
                >
                  <div className="sale-form-item-head">
                    <strong>Item {index + 1}</strong>
                    {items.length > 0 && (
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Remover produto"
                        onClick={() =>
                          removeItem(item.key)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="sale-form-item-grid">
                    <label className="field sale-product-field">
                      <span>Produto</span>
                      <SaleProductComboboxV45234
                        options={searchableProductOptions}
                        value={item.productId}
                        onChange={(productId) =>
                          selectProduct(
                            item.key,
                            productId,
                          )
                        }
                      />
                      <small>
                        Produtos com saldo neste estoque aparecem
                        em verde. Sem estoque continua selecionável.
                      </small>
                    </label>

                    {productFlavors.length > 0 && (
                      <label className="field">
                        <span>Sabor</span>
                        <select
                          className="select"
                          required
                          value={item.flavorId}
                          onChange={(event) =>
                            updateItem(item.key, {
                              flavorId:
                                event.target.value,
                            })
                          }
                        >
                          <option value="">
                            Selecione
                          </option>

                          {productFlavors.map((flavor) => {
                            const stockRow =
                              flavorStock.find(
                                (stockEntry) =>
                                  stockEntry.flavorId ===
                                    flavor.id &&
                                  stockEntry.locationId ===
                                    locationId,
                              );

                            return (
                              <option
                                key={flavor.id}
                                value={flavor.id}
                              >
                                {flavor.name} · disp.{" "}
                                {stockRow?.available ?? 0}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    )}

                    <label className="field">
                      <span>Quantidade</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.key, {
                            quantity:
                              event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Preço de venda</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.key, {
                            unitPrice:
                              event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  {row && (
                    <div className="sale-stock-strip">
                      {selectedFlavor && (
                        <span>
                          Sabor{" "}
                          <strong>
                            {selectedFlavor.name}
                          </strong>
                        </span>
                      )}
                      <span>
                        Custo{" "}
                        <strong>
                          {formatCurrency(
                            row.cost_price,
                          )}
                        </strong>
                      </span>
                      {lastPurchaseCostDiffers && (
                        <span className="v4521-last-cost-chip">
                          Última compra{" "}
                          <strong>
                            {formatCurrency(
                              Number(lastPurchaseCost?.cost ?? 0),
                            )}
                          </strong>
                          {lastPurchaseCost?.purchasedOn && (
                            <small>
                              {new Intl.DateTimeFormat(
                                "pt-BR",
                              ).format(
                                new Date(
                                  `${lastPurchaseCost.purchasedOn}T12:00:00`,
                                ),
                              )}
                            </small>
                          )}
                        </span>
                      )}
                      <span>
                        Preço padrão{" "}
                        <strong>
                          {formatCurrency(
                            row.sale_price,
                          )}
                        </strong>
                      </span>
                      <span>
                        Físico{" "}
                        <strong>
                          {selectedFlavorStock?.physical ??
                            row.physical_quantity}
                        </strong>
                      </span>
                      <span>
                        Reservado{" "}
                        <strong>
                          {selectedFlavorStock?.reserved ??
                            row.reserved_quantity}
                        </strong>
                      </span>
                      <span>
                        Disponível{" "}
                        <strong
                          className={
                            displayedAvailable >= quantity
                              ? "positive"
                              : "warning-text"
                          }
                        >
                          {displayedAvailable}
                        </strong>
                      </span>
                      {selectedFlavorStock && (
                        <span>
                          A caminho{" "}
                          <strong>
                            {
                              selectedFlavorStock.incoming
                            }
                          </strong>
                        </span>
                      )}
                      <span>
                        Condição{" "}
                        <strong>{condition}</strong>
                      </span>
                      <span>
                        Subtotal{" "}
                        <strong>
                          {formatCurrency(
                            quantity * unitPrice,
                          )}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Ajustes do valor e brinde</h2>
              <p>
                Desconto reduz o total. Lucro do combinado adiciona
                ao valor final sem alterar o preço individual dos produtos.
              </p>
            </div>
            <Gift size={20} />
          </div>

          <div className="panel-body form-grid-two">
            <label className="field">
              <span>
                <Percent size={14} /> Desconto total (R$)
              </span>
              <input
                className="input"
                type="number"
                min="0"
                max={grossTotal}
                step="0.01"
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value)
                }
              />
              <small>
                Subtotal atual:{" "}
                {formatCurrency(grossTotal)}
              </small>
            </label>

            <label className="field">
              <span>
                <CircleDollarSign size={14} /> Lucro do combinado (R$)
              </span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={agreedMarkup}
                onChange={(event) =>
                  setAgreedMarkup(event.target.value)
                }
              />
              <small>
                Use quando o valor negociado ficou acima da soma dos
                produtos. Esse valor entra integralmente como receita e
                lucro adicional da venda.
              </small>
            </label>

            <label className="field">
              <span>
                <Gift size={14} /> Produto de brinde
              </span>
              <select
                className="select"
                value={giftProductId}
                onChange={(event) => {
                  setGiftProductId(event.target.value);

                  if (
                    event.target.value &&
                    !giftQuantity
                  ) {
                    setGiftQuantity("1");
                  }
                }}
              >
                <option value="">Sem brinde</option>
                {productOptions
                  .filter(
                    (product) =>
                      flavorsFor(product.product_id)
                        .length === 0,
                  )
                  .map((product) => (
                    <option
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.product_name}
                    </option>
                  ))}
              </select>
            </label>

            {giftProductId && (
              <label className="field">
                <span>Quantidade do brinde</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={giftQuantity}
                  onChange={(event) =>
                    setGiftQuantity(event.target.value)
                  }
                />
                {giftRow && (
                  <small>
                    Disponível em{" "}
                    {giftRow.location_code}:{" "}
                    {giftRow.available_quantity} un.
                  </small>
                )}
              </label>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Observações</h2>
              <p>
                Informações que também podem aparecer no PDF
                enviado ao cliente.
              </p>
            </div>
          </div>

          <div className="panel-body">
            <label className="field">
              <span>Observações do orçamento</span>
              <textarea
                className="textarea"
                rows={5}
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Ex.: condição especial, prazo, retirada, combinação com o cliente..."
              />
            </label>
          </div>
        </article>
      </div>

      <aside className="new-sale-side">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Pagamento</h2>
              <p>
                Condição proposta para este orçamento.
              </p>
            </div>
          </div>

          <div className="panel-body option-stack">
            <label
              className={`choice-card ${
                paymentMode === "receivable"
                  ? "active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={
                  paymentMode === "receivable"
                }
                onChange={() =>
                  selectPaymentMode("receivable")
                }
              />
              <span>
                <strong>A receber</strong>
                <small>Sem data combinada.</small>
              </span>
            </label>

            <label
              className={`choice-card ${
                paymentMode === "paid"
                  ? "active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === "paid"}
                onChange={() =>
                  selectPaymentMode("paid")
                }
              />
              <span>
                <strong>Pago</strong>
                <small>
                  Ao confirmar a venda, registra o
                  recebimento integral.
                </small>
              </span>
            </label>

            <label
              className={`choice-card ${
                paymentMode === "combined"
                  ? "active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={
                  paymentMode === "combined"
                }
                onChange={() =>
                  selectPaymentMode("combined")
                }
              />
              <span>
                <strong>Pagamento combinado</strong>
                <small>
                  Uma cobrança única com data acordada.
                </small>
              </span>
            </label>

            <label
              className={`choice-card ${
                paymentMode === "split"
                  ? "active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === "split"}
                onChange={() =>
                  selectPaymentMode("split")
                }
              />
              <span>
                <strong>Pagamento dividido</strong>
                <small>
                  Duas ou mais parcelas com valores e
                  vencimentos próprios.
                </small>
              </span>
            </label>

            {paymentMode !== "split" && (
              <div className="conditional-fields">
                <label className="field">
                  <span>Forma de pagamento</span>
                  <select
                    className="select"
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target
                          .value as PaymentMethod,
                      )
                    }
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {paymentMode === "paid" && (
              <div className="conditional-fields">
                <label className="field">
                  <span>Data do pagamento</span>
                  <input
                    className="input"
                    type="date"
                    required
                    value={paidOn}
                    onChange={(event) =>
                      setPaidOn(event.target.value)
                    }
                  />
                </label>
              </div>
            )}

            {paymentMode === "combined" && (
              <div className="conditional-fields">
                <label className="field">
                  <span>Data combinada</span>
                  <input
                    className="input"
                    type="date"
                    required
                    value={paymentDueOn}
                    onChange={(event) =>
                      setPaymentDueOn(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            )}

            {paymentMode === "split" && (
              <PaymentInstallmentEditor
                total={finalTotal}
                installments={paymentInstallments}
                onChange={setPaymentInstallments}
                firstDueOn={today}
              />
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Entrega</h2>
              <p>
                Usado somente se escolher Orçamento
                confirmado.
              </p>
            </div>
          </div>

          <div className="panel-body option-stack">
            <label
              className={`choice-card ${
                delivered ? "active" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={delivered}
                onChange={(event) =>
                  setDelivered(event.target.checked)
                }
              />
              <span>
                <strong>Já foi entregue</strong>
                <small>
                  Ao confirmar, baixa o estoque do sabor
                  selecionado.
                </small>
              </span>
            </label>

            {delivered ? (
              <div className="conditional-fields">
                <label className="field">
                  <span>Data da entrega</span>
                  <input
                    className="input"
                    type="date"
                    required
                    value={deliveredOn}
                    onChange={(event) =>
                      setDeliveredOn(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            ) : (
              <div className="conditional-fields">
                <label className="field">
                  <span>Entrega prevista</span>
                  <input
                    className="input"
                    type="date"
                    value={deliveryDueOn}
                    onChange={(event) =>
                      setDeliveryDueOn(
                        event.target.value,
                      )
                    }
                  />
                  <small>
                    Na confirmação, a venda aparecerá na
                    Agenda.
                  </small>
                </label>
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Pós-venda</h2>
              <p>
                Agendado apenas quando o orçamento for
                confirmado.
              </p>
            </div>
          </div>

          <div className="panel-body option-stack">
            <label
              className={`choice-card ${
                schedulePostSale ? "active" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={schedulePostSale}
                onChange={(event) =>
                  setSchedulePostSale(
                    event.target.checked,
                  )
                }
              />
              <span>
                <strong>Agendar pós-venda</strong>
                <small>
                  Lembrete vinculado ao cliente e à venda.
                </small>
              </span>
            </label>

            {schedulePostSale && (
              <div className="conditional-fields">
                <label className="field">
                  <span>Data do pós-venda</span>
                  <input
                    className="input"
                    type="date"
                    required
                    value={postSaleDueOn}
                    onChange={(event) =>
                      setPostSaleDueOn(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Parceria</h2>
              <p>
                Pode ser mantida ao converter o orçamento em
                venda.
              </p>
            </div>
          </div>

          <div className="panel-body option-stack">
            <label
              className={`choice-card ${
                partnership ? "active" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={partnership}
                onChange={(event) =>
                  setPartnership(
                    event.target.checked,
                  )
                }
              />
              <span>
                <strong>Elegível à parceria</strong>
                <small>
                  Contabiliza a venda confirmada para o
                  parceiro.
                </small>
              </span>
            </label>

            {partnership && (
              <div className="conditional-fields">
                <label className="field">
                  <span>Parceiro</span>
                  <select
                    className="select"
                    required
                    value={partnerId}
                    onChange={(event) =>
                      setPartnerId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecione o parceiro
                    </option>
                    {partners.map((partner) => (
                      <option
                        key={partner.id}
                        value={partner.id}
                      >
                        {partner.name} ·{" "}
                        {partner.partner_type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </article>

        <article className="panel sale-form-summary budget-summary">
          <PackagePlus size={22} />
          <div>
            <span>Subtotal</span>
            <strong>
              {formatCurrency(grossTotal)}
            </strong>
            {discountValue > 0 && (
              <small>
                Desconto: -
                {formatCurrency(discountValue)}
              </small>
            )}
            {agreedMarkupValue > 0 && (
              <small className="positive">
                Lucro do combinado: +
                {formatCurrency(agreedMarkupValue)}
              </small>
            )}
            <span className="budget-final-label">
              Total final
            </span>
            <strong className="budget-final-value">
              {formatCurrency(finalTotal)}
            </strong>
            <small>
              {items.length}{" "}
              {items.length === 1 ? "item" : "itens"}
              {giftProductId ? " + brinde" : ""}
            </small>
          </div>
        </article>

        <div className="sale-form-actions">
          <Link className="button ghost" href="/suplementos/vendas">
            Cancelar
          </Link>

          <button
            className="button gold"
            type="submit"
            disabled={Boolean(loadingMode)}
          >
            {loadingMode ? (
              <LoaderCircle
                className="spin"
                size={17}
              />
            ) : (
              <Save size={17} />
            )}{" "}
            {loadingMode
              ? "Salvando"
              : "Salvar orçamento"}
          </button>
        </div>

        {message && (
          <p className="form-message standalone-message">
            {message}
          </p>
        )}
      </aside>

      {choiceOpen && (
        <div
          className="budget-choice-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loadingMode
            ) {
              setChoiceOpen(false);
            }
          }}
        >
          <section
            className="budget-choice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-choice-title"
          >
            <button
              className="budget-choice-close"
              type="button"
              aria-label="Fechar"
              disabled={Boolean(loadingMode)}
              onClick={() =>
                setChoiceOpen(false)
              }
            >
              <X size={18} />
            </button>

            <div className="budget-choice-heading">
              <FileText size={25} />
              <div>
                <span>Salvar orçamento</span>
                <h2 id="budget-choice-title">
                  O cliente já confirmou?
                </h2>
                <p>
                  Escolha o destino. O PDF fica
                  disponível nos dois casos.
                </p>
              </div>
            </div>

            <div className="budget-choice-grid">
              <button
                className="budget-choice-card confirmed"
                type="button"
                disabled={Boolean(loadingMode)}
                onClick={() =>
                  persist("confirmed")
                }
              >
                <PackageCheck size={25} />
                <span>
                  <strong>
                    Orçamento confirmado
                  </strong>
                  <small>
                    Cria a venda normal, preserva o
                    sabor escolhido e movimenta o
                    estoque correto.
                  </small>
                </span>
                {loadingMode === "confirmed" && (
                  <LoaderCircle
                    className="spin"
                    size={18}
                  />
                )}
              </button>

              <button
                className="budget-choice-card quote"
                type="button"
                disabled={Boolean(loadingMode)}
                onClick={() => {
                  setChoiceOpen(false);
                  setQuoteFinalizeOpen(true);
                }}
              >
                <FileText size={25} />
                <span>
                  <strong>Apenas orçando</strong>
                  <small>
                    Não mexe no estoque. Salva
                    cliente, produtos e parcelas e
                    mantém o PDF disponível.
                  </small>
                </span>
                {loadingMode === "quote" && (
                  <LoaderCircle
                    className="spin"
                    size={18}
                  />
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {quoteFinalizeOpen && (
        <div
          className="budget-choice-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loadingMode
            ) {
              setQuoteFinalizeOpen(false);
              setChoiceOpen(true);
            }
          }}
        >
          <section
            className="budget-choice-modal v45234-quote-finalize"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v45234-quote-validity-title"
          >
            <button
              className="budget-choice-close"
              type="button"
              aria-label="Voltar"
              disabled={Boolean(loadingMode)}
              onClick={() => {
                setQuoteFinalizeOpen(false);
                setChoiceOpen(true);
              }}
            >
              <X size={18} />
            </button>

            <div className="budget-choice-heading">
              <FileText size={25} />
              <div>
                <span>Apenas orçamento</span>
                <h2 id="v45234-quote-validity-title">
                  Até quando essa proposta vale?
                </h2>
                <p>
                  A validade só é necessária quando ainda é uma
                  proposta. Ela não aparece na venda confirmada.
                </p>
              </div>
            </div>

            <label className="field v45234-validity-field">
              <span>Validade do orçamento</span>
              <input
                className="input"
                type="date"
                min={quotedOn}
                required
                value={validUntil}
                onChange={(event) =>
                  setValidUntil(event.target.value)
                }
              />
            </label>

            <div className="v45234-quote-finalize-actions">
              <button
                className="button ghost"
                type="button"
                disabled={Boolean(loadingMode)}
                onClick={() => {
                  setQuoteFinalizeOpen(false);
                  setChoiceOpen(true);
                }}
              >
                Voltar
              </button>

              <button
                className="button gold"
                type="button"
                disabled={Boolean(loadingMode)}
                onClick={() => persist("quote")}
              >
                {loadingMode === "quote" ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}
                {loadingMode === "quote"
                  ? "Salvando"
                  : "Salvar orçamento"}
              </button>
            </div>
          </section>
        </div>
      )}
      {savedBudgetPrompt && (
        <div
          className="budget-choice-backdrop"
          role="presentation"
        >
          <section
            className="budget-choice-modal budget-pdf-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-pdf-title"
          >
            <div className="budget-choice-heading">
              <CheckCircle2 size={26} />
              <div>
                <span>Orçamento salvo</span>
                <h2 id="budget-pdf-title">
                  Deseja abrir o PDF agora?
                </h2>
                <p>
                  O registro já foi salvo. Você pode
                  abrir o PDF ou seguir direto para o
                  próximo passo.
                </p>
              </div>
            </div>

            <div className="budget-choice-grid">
              <button
                className="budget-choice-card confirmed"
                type="button"
                onClick={() =>
                  finishSavedBudget(true)
                }
              >
                <FileText size={25} />
                <span>
                  <strong>Abrir PDF</strong>
                  <small>
                    Abre a proposta em uma nova guia
                    e depois segue para o registro
                    salvo.
                  </small>
                </span>
              </button>

              <button
                className="budget-choice-card quote"
                type="button"
                onClick={() =>
                  finishSavedBudget(false)
                }
              >
                <CheckCircle2 size={25} />
                <span>
                  <strong>Continuar sem PDF</strong>
                  <small>
                    Vai direto para a venda ou lead
                    criado.
                  </small>
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </form>
  );
}
