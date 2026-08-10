"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  PackageOpen,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

const TARGET_QUANTITY = 10;

type PurchaseDecision = "pending" | "accepted" | "dismissed";

type PurchaseSuggestion = {
  suggestion_key: string;
  family_key: string;
  family_name: string;
  size: string;
  color: string;
  sold_30d: number;
  sold_90d: number;
  matched_products: string[];
  suggested_quantity: number;
  decision: PurchaseDecision;
  score: number;
};

type PurchasePayload = {
  suggestions?: unknown[];
  target_quantity?: number;
  basket_quantity?: number;
  basket_item_count?: number;
  basket_complete?: boolean;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quantity(value: unknown) {
  return Math.min(2, Math.max(1, Math.round(number(value) || 1)));
}

function normalizeSuggestion(value: unknown): PurchaseSuggestion {
  const row = object(value);
  const rawDecision = String(row.decision ?? "pending");

  return {
    suggestion_key: String(row.suggestion_key ?? ""),
    family_key: String(row.family_key ?? ""),
    family_name: String(row.family_name ?? "Produto"),
    size: String(row.size ?? "Único"),
    color: String(row.color ?? "Sem cor"),
    sold_30d: number(row.sold_30d),
    sold_90d: number(row.sold_90d),
    matched_products: Array.isArray(row.matched_products)
      ? row.matched_products.map(String)
      : [],
    suggested_quantity: quantity(row.suggested_quantity),
    decision:
      rawDecision === "accepted" || rawDecision === "dismissed"
        ? rawDecision
        : "pending",
    score: number(row.score),
  };
}

export function FitnessNexusPurchaseBasketV2() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = document.querySelector<HTMLElement>(
      ".fitness-nexus-lab-v2",
    );
    const center = wrapper?.firstElementChild as HTMLElement | null;

    if (!center) return;

    const oldPanel = Array.from(
      center.querySelectorAll<HTMLElement>(":scope > section.panel"),
    ).find(
      (panel) =>
        panel.querySelector(".panel-head h2")?.textContent?.trim() ===
        "Sugestão da próxima compra",
    );

    if (!oldPanel) return;

    const portalHost = document.createElement("div");
    portalHost.className = "fitness-nexus-purchase-v2-host";
    center.insertBefore(portalHost, oldPanel);
    setHost(portalHost);

    return () => {
      portalHost.remove();
      setHost(null);
    };
  }, []);

  const loadBasket = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc(
      "fitness_nexus_purchase_suggestions_v1",
    );

    if (error) throw error;

    const payload = object(data) as PurchasePayload;
    const rows = Array.isArray(payload.suggestions)
      ? payload.suggestions.map(normalizeSuggestion)
      : [];

    setSuggestions(rows);
    setQuantities((current) => {
      const next: Record<string, number> = {};

      for (const item of rows) {
        next[item.suggestion_key] =
          item.decision === "accepted"
            ? item.suggested_quantity
            : quantity(current[item.suggestion_key] ?? item.suggested_quantity);
      }

      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    void loadBasket()
      .catch((error) => {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível montar a próxima compra.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadBasket]);

  const selectedQuantity = useMemo(
    () =>
      suggestions.reduce(
        (sum, item) =>
          item.decision === "accepted"
            ? sum + quantity(quantities[item.suggestion_key] ?? item.suggested_quantity)
            : sum,
        0,
      ),
    [quantities, suggestions],
  );

  const proposedQuantity = useMemo(
    () =>
      suggestions.reduce(
        (sum, item) =>
          sum + quantity(quantities[item.suggestion_key] ?? item.suggested_quantity),
        0,
      ),
    [quantities, suggestions],
  );

  const missingQuantity = Math.max(0, TARGET_QUANTITY - selectedQuantity);
  const progress = Math.min(100, (selectedQuantity / TARGET_QUANTITY) * 100);

  async function decide(
    suggestion: PurchaseSuggestion,
    decision: PurchaseDecision,
    forcedQuantity?: number,
  ) {
    if (loadingKey) return;

    const selected = quantity(
      forcedQuantity ??
        quantities[suggestion.suggestion_key] ??
        suggestion.suggested_quantity,
    );

    setLoadingKey(suggestion.suggestion_key);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "set_fitness_nexus_purchase_decision_v1",
        {
          p_suggestion_key: suggestion.suggestion_key,
          p_family_key: suggestion.family_key,
          p_family_name: suggestion.family_name,
          p_size: suggestion.size,
          p_color: suggestion.color,
          p_decision: decision,
          p_suggested_quantity: selected,
        },
      );

      if (error) throw error;

      if (decision === "accepted") {
        setMessage(
          `${selected} peça${selected > 1 ? "s" : ""} incluída${
            selected > 1 ? "s" : ""
          } na próxima compra.`,
        );
      } else if (decision === "dismissed") {
        setMessage(
          "Entendi. Essa combinação perde prioridade e o Nexus busca outra opção para completar a cesta.",
        );
      } else {
        setMessage(
          "Item desmarcado. Isso não conta como recusa e não reduz a prioridade.",
        );
      }

      await loadBasket();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar essa decisão.",
      );
    } finally {
      setLoadingKey(null);
    }
  }

  function changeQuantity(suggestion: PurchaseSuggestion, delta: -1 | 1) {
    const current = quantity(
      quantities[suggestion.suggestion_key] ?? suggestion.suggested_quantity,
    );
    const next = quantity(current + delta);

    if (next === current) return;

    setQuantities((state) => ({
      ...state,
      [suggestion.suggestion_key]: next,
    }));

    if (suggestion.decision === "accepted") {
      void decide(suggestion, "accepted", next);
    }
  }

  const content = (
    <section className="panel fitness-nexus-purchase-v2">
      <div className="panel-head fitness-nexus-purchase-v2-head">
        <div>
          <span className="fitness-nexus-purchase-v2-eyebrow">
            <ShoppingBag size={14} />
            Próxima compra
          </span>
          <h2>Cesta sugerida pelo Nexus</h2>
          <p>
            A meta mínima é 10 peças no pedido inteiro. Normalmente entra 1 de
            cada combinação; itens com procura mais forte podem receber 2.
          </p>
        </div>
        <PackageOpen size={20} />
      </div>

      <div className="panel-body fitness-nexus-purchase-v2-body">
        <div className="fitness-nexus-purchase-v2-summary">
          <div>
            <span>Selecionado</span>
            <strong>
              {selectedQuantity} de {TARGET_QUANTITY} peças
            </strong>
            <small>
              {missingQuantity === 0
                ? "Mínimo do pedido atingido."
                : `Faltam ${missingQuantity} peça${missingQuantity > 1 ? "s" : ""}.`}
            </small>
          </div>

          <div>
            <span>Cesta proposta</span>
            <strong>{proposedQuantity} peças</strong>
            <small>{suggestions.length} combinação(ões) sugerida(s)</small>
          </div>

          <div className="fitness-nexus-purchase-v2-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        {loading ? (
          <div className="fitness-nexus-purchase-v2-loading">
            <LoaderCircle className="spin" size={18} />
            Montando a próxima compra…
          </div>
        ) : suggestions.length > 0 ? (
          <div className="fitness-nexus-purchase-v2-list">
            {suggestions.map((suggestion) => {
              const selected = quantity(
                quantities[suggestion.suggestion_key] ?? suggestion.suggested_quantity,
              );
              const busy = loadingKey === suggestion.suggestion_key;

              return (
                <article
                  className={`fitness-nexus-purchase-v2-card ${
                    suggestion.decision === "accepted" ? "accepted" : ""
                  }`}
                  key={suggestion.suggestion_key}
                >
                  <div className="fitness-nexus-purchase-v2-copy">
                    <span>
                      {suggestion.decision === "accepted"
                        ? "Incluído na cesta"
                        : "Nexus sugere"}
                    </span>
                    <strong>
                      {suggestion.family_name} · {suggestion.size} · {suggestion.color}
                    </strong>
                    <p>
                      {suggestion.sold_90d} saída(s) em 90 dias
                      {suggestion.sold_30d > 0
                        ? ` · ${suggestion.sold_30d} nos últimos 30 dias`
                        : ""}
                    </p>
                    {suggestion.matched_products.length > 0 && (
                      <small>
                        Baseado em: {suggestion.matched_products.join(", ")}
                      </small>
                    )}
                  </div>

                  <div className="fitness-nexus-purchase-v2-controls">
                    <div
                      className="fitness-nexus-purchase-v2-quantity"
                      aria-label={`Quantidade de ${suggestion.family_name}`}
                    >
                      <button
                        type="button"
                        aria-label="Diminuir para 1 peça"
                        disabled={busy || selected <= 1}
                        onClick={() => changeQuantity(suggestion, -1)}
                      >
                        <ChevronDown size={14} />
                      </button>
                      <span>
                        <strong>{selected}</strong>
                        <small>{selected === 1 ? "peça" : "peças"}</small>
                      </span>
                      <button
                        type="button"
                        aria-label="Aumentar para 2 peças"
                        disabled={busy || selected >= 2}
                        onClick={() => changeQuantity(suggestion, 1)}
                      >
                        <ChevronUp size={14} />
                      </button>
                    </div>

                    {suggestion.decision === "accepted" ? (
                      <button
                        className="button ghost compact-button"
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(suggestion, "pending")}
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : (
                          <X size={14} />
                        )}
                        Desmarcar
                      </button>
                    ) : (
                      <>
                        <button
                          className="button gold compact-button"
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(suggestion, "accepted")}
                        >
                          {busy ? (
                            <LoaderCircle className="spin" size={14} />
                          ) : (
                            <Check size={14} />
                          )}
                          Incluir {selected}
                        </button>
                        <button
                          className="button ghost compact-button"
                          type="button"
                          disabled={busy}
                          onClick={() => void decide(suggestion, "dismissed")}
                        >
                          <X size={14} />
                          Não incluir
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty compact">
            Nenhuma combinação zerada com histórico de venda precisa entrar
            na próxima compra agora.
          </div>
        )}

        {message && (
          <div
            className="fitness-nexus-purchase-v2-message"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <div className="fitness-nexus-purchase-v2-footer">
          <span>
            O Nexus não cria pedido sozinho e não escolhe fornecedor. Depois
            de fechar a cesta, use a lista para montar o pedido.
          </span>
          {selectedQuantity >= TARGET_QUANTITY && (
            <Link className="button gold compact-button" href="/fitness/pedidos">
              <ShoppingBag size={14} />
              Ir para pedidos
            </Link>
          )}
        </div>
      </div>
    </section>
  );

  return host ? createPortal(content, host) : null;
}
