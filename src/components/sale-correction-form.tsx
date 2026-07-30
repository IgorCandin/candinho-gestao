"use client";

import Link from "next/link";
import {
  BadgePercent,
  CheckCircle2,
  FileText,
  LoaderCircle,
  PackagePlus,
  Search,
  ShoppingBag,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import styles from "./sale-correction.module.css";

export type SaleCorrectionProduct = {
  productId: string;
  name: string;
  category: string;
  brand: string | null;
  imageUrl: string | null;
  costPrice: number;
  regularPrice: number;
  effectivePrice: number;
  availableQuantity: number;
  promotionName: string | null;
  promotionDiscountPct: number;
};

export type SaleCorrectionFlavor = {
  id: string;
  productId: string;
  name: string;
};

type AmendmentResult = {
  sale_id?: string;
  quote_id?: string | null;
  sale_item_id?: string;
  product_name?: string;
  quantity_added?: number;
  unit_price?: number;
  old_total?: number;
  new_total?: number;
  delta_total?: number;
  stock_adjusted_immediately?: boolean;
};

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function productPriceCondition(
  product: SaleCorrectionProduct,
  price: number,
) {
  if (
    product.promotionName &&
    Math.abs(price - product.effectivePrice) < 0.005
  ) {
    return "Promoção";
  }

  if (Math.abs(price - product.regularPrice) < 0.005) {
    return "Preço normal";
  }

  if (price < product.regularPrice) return "Desconto";

  return "Preço combinado";
}

export function SaleCorrectionForm({
  saleId,
  customerName,
  currentTotal,
  locationLabel,
  deliveryStatus,
  quoteId,
  products,
  flavors,
}: {
  saleId: string;
  customerName: string;
  currentTotal: number;
  locationLabel: string;
  deliveryStatus: string;
  quoteId: string | null;
  products: SaleCorrectionProduct[];
  flavors: SaleCorrectionFlavor[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [flavorId, setFlavorId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [reason, setReason] = useState(
    "Produto esquecido ao finalizar a venda",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AmendmentResult | null>(null);

  const selected =
    products.find((product) => product.productId === productId) ?? null;

  const selectedFlavors = flavors.filter(
    (flavor) => flavor.productId === productId,
  );

  const filtered = useMemo(() => {
    const needle = normalized(query.trim());

    return products
      .filter((product) => {
        if (!needle) return true;

        return normalized(
          `${product.name} ${product.category} ${product.brand ?? ""}`,
        ).includes(needle);
      })
      .slice(0, 40);
  }, [products, query]);

  const qty = Math.max(Number(quantity) || 0, 0);
  const price = Math.max(Number(unitPrice) || 0, 0);
  const addedTotal = qty * price;
  const projectedTotal = currentTotal + addedTotal;

  function chooseProduct(product: SaleCorrectionProduct) {
    setProductId(product.productId);
    setFlavorId("");
    setUnitPrice(String(product.effectivePrice));
    setMessage(null);
    setResult(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResult(null);

    try {
      if (!selected) throw new Error("Selecione o produto que ficou faltando.");
      if (qty <= 0) throw new Error("Informe uma quantidade válida.");

      if (selectedFlavors.length > 0 && !flavorId) {
        throw new Error(`Selecione o sabor de ${selected.name}.`);
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Revise o preço do produto.");
      }

      setLoading(true);

      const { data, error } = await createClient().rpc(
        "append_item_to_confirmed_sale_v1",
        {
          p_sale_id: saleId,
          p_product_id: selected.productId,
          p_flavor_id: flavorId || null,
          p_quantity: qty,
          p_unit_price: price,
          p_reason: reason.trim() || null,
          p_price_condition: productPriceCondition(selected, price),
        },
      );

      if (error) throw error;

      const payload =
        data && typeof data === "object"
          ? (data as AmendmentResult)
          : {};

      setResult(payload);
      setMessage(
        `${selected.name} adicionado. Venda, estoque, financeiro e PDF foram sincronizados.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível corrigir a venda.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const updatedQuoteId =
      typeof result.quote_id === "string" ? result.quote_id : quoteId;

    return (
      <article className={`panel ${styles.successPanel}`}>
        <div className={styles.successIcon}>
          <CheckCircle2 size={30} />
        </div>

        <div>
          <span className={styles.eyebrow}>Correção concluída</span>
          <h2>{result.product_name ?? selected?.name ?? "Produto"} incluído</h2>
          <p>
            A venda foi atualizada sem cancelar o registro original. O saldo
            a receber passa a considerar o novo total automaticamente.
          </p>
        </div>

        <div className={styles.resultGrid}>
          <div>
            <span>Total anterior</span>
            <strong>{formatCurrency(Number(result.old_total ?? currentTotal))}</strong>
          </div>
          <div>
            <span>Valor acrescentado</span>
            <strong className="positive">
              + {formatCurrency(Number(result.delta_total ?? addedTotal))}
            </strong>
          </div>
          <div>
            <span>Novo total</span>
            <strong>{formatCurrency(Number(result.new_total ?? projectedTotal))}</strong>
          </div>
          <div>
            <span>Estoque</span>
            <strong>
              {result.stock_adjusted_immediately
                ? "Baixado agora"
                : "Reservado"}
            </strong>
          </div>
        </div>

        <div className={styles.successActions}>
          {updatedQuoteId && (
            <a
              className="button gold"
              href={`/api/orcamentos/${updatedQuoteId}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={16} />
              Abrir PDF atualizado
            </a>
          )}

          <Link className="button ghost" href={`/vendas/${saleId}`}>
            <ShoppingBag size={16} />
            Voltar para venda
          </Link>
        </div>
      </article>
    );
  }

  return (
    <form className={styles.formLayout} onSubmit={submit}>
      <div className={styles.mainColumn}>
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>1. Produto esquecido</h2>
              <p>
                Todos continuam visíveis em ordem alfabética. Os que possuem
                estoque aparecem destacados em verde.
              </p>
            </div>
            <PackagePlus size={20} />
          </div>

          <div className={`panel-body ${styles.productPicker}`}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar Whey, creatina, marca ou categoria"
                autoComplete="off"
              />
            </label>

            <div className={styles.productList}>
              {filtered.map((product) => {
                const active = product.productId === productId;
                const available = product.availableQuantity > 0;

                return (
                  <button
                    className={[
                      styles.productOption,
                      available ? styles.available : "",
                      active ? styles.selected : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    type="button"
                    key={product.productId}
                    onClick={() => chooseProduct(product)}
                  >
                    <div className={styles.productCopy}>
                      <strong>{product.name}</strong>
                      <span>
                        {[product.category, product.brand]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>

                    <div className={styles.productMeta}>
                      <span
                        className={
                          available ? styles.stockAvailable : styles.stockZero
                        }
                      >
                        <Warehouse size={12} />
                        {available
                          ? `${product.availableQuantity} disponível`
                          : "Sem estoque"}
                      </span>

                      {product.promotionName ? (
                        <span className={styles.promoPrice}>
                          <BadgePercent size={12} />
                          <s>{formatCurrency(product.regularPrice)}</s>
                          <b>{formatCurrency(product.effectivePrice)}</b>
                        </span>
                      ) : (
                        <b>{formatCurrency(product.effectivePrice)}</b>
                      )}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="empty compact">
                  <strong>Nenhum produto encontrado</strong>
                  Tente outro nome, marca ou categoria.
                </div>
              )}
            </div>
          </div>
        </article>

        {selected && (
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>2. Conferir item</h2>
                <p>{selected.name}</p>
              </div>
            </div>

            <div className={`panel-body ${styles.fields}`}>
              {selectedFlavors.length > 0 && (
                <label className="field">
                  <span>Sabor</span>
                  <select
                    className="select"
                    required
                    value={flavorId}
                    onChange={(event) => setFlavorId(event.target.value)}
                  >
                    <option value="">Selecione o sabor</option>
                    {selectedFlavors.map((flavor) => (
                      <option key={flavor.id} value={flavor.id}>
                        {flavor.name}
                      </option>
                    ))}
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
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Preço por unidade</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                />
                {selected.promotionName && (
                  <small>
                    Promoção ativa: {selected.promotionName}. Preço normal{" "}
                    {formatCurrency(selected.regularPrice)}.
                  </small>
                )}
              </label>

              <label className={`field ${styles.reason}`}>
                <span>Motivo da correção</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ex.: produto esquecido no lançamento da venda"
                />
              </label>
            </div>
          </article>
        )}
      </div>

      <aside className={styles.sideColumn}>
        <article className={`panel ${styles.summary}`}>
          <div className="panel-head">
            <div>
              <h2>Resumo da correção</h2>
              <p>{customerName}</p>
            </div>
          </div>

          <div className="panel-body">
            <div className={styles.summaryLine}>
              <span>Total atual</span>
              <strong>{formatCurrency(currentTotal)}</strong>
            </div>

            <div className={styles.summaryLine}>
              <span>Novo item</span>
              <strong>+ {formatCurrency(addedTotal)}</strong>
            </div>

            <div className={`${styles.summaryLine} ${styles.projected}`}>
              <span>Novo total</span>
              <strong>{formatCurrency(projectedTotal)}</strong>
            </div>

            <div className={styles.operationalNote}>
              <Warehouse size={16} />
              <div>
                <strong>{locationLabel}</strong>
                <span>
                  {deliveryStatus === "delivered"
                    ? "Venda já entregue: o novo item será baixado do estoque imediatamente."
                    : "Venda ainda não entregue: o novo item será reservado. Se faltar estoque, ficará aguardando reposição."}
                </span>
              </div>
            </div>

            <button
              className="button gold"
              type="submit"
              disabled={loading || !selected}
            >
              {loading ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <PackagePlus size={17} />
              )}
              {loading ? "Corrigindo..." : "Adicionar à venda"}
            </button>

            {message && <p className={styles.message}>{message}</p>}
          </div>
        </article>
      </aside>
    </form>
  );
}
