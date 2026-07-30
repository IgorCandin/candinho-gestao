"use client";

import {
  CheckCircle2,
  Copy,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PublicCatalogLeadForm } from "@/components/public-nexus-advisor";
import type { PublicProductFlavor } from "@/lib/public-product-page-data";
import styles from "./public-catalog-experience.module.css";

function sessionId() {
  if (typeof window === "undefined") return "";

  const key = "candinho:public-catalog-session";
  const current = window.sessionStorage.getItem(key);
  if (current) return current;

  const next =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(key, next);
  return next;
}

export function PublicProductBuyPanel({
  productId,
  productName,
  productSlug,
  flavors,
  available,
  messageTemplate,
}: {
  productId: string;
  productName: string;
  productSlug: string;
  flavors: PublicProductFlavor[];
  available: boolean;
  messageTemplate: string | null;
}) {
  const [quantity, setQuantity] = useState("1");
  const [flavor, setFlavor] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableFlavors = flavors.filter((item) => item.available);

  const message = useMemo(() => {
    const qty = Math.max(Number(quantity) || 1, 1);
    const base =
      messageTemplate?.trim() ||
      `Oi! Vi ${productName} no catálogo da Candinho e tenho interesse.`;

    return `${base}\nQuantidade: ${qty}${
      flavor ? `\nSabor: ${flavor}` : ""
    }\nProduto: /catalogo/${productSlug}`;
  }, [flavor, messageTemplate, productName, productSlug, quantity]);

  async function track(eventType: string) {
    try {
      await fetch("/api/catalogo/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          product_id: productId,
          session_id: sessionId(),
          metadata: { placement: "product_buy_panel" },
        }),
        keepalive: true,
      });
    } catch {
      // Sem impacto na compra.
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    void track("buy_intent");
  }

  return (
    <div className={styles.buyPanel}>
      <strong>
        {available ? "Quero esse produto" : "Quero saber quando tiver disponível"}
      </strong>

      {available && (
        <div className={styles.buyFields}>
          <input
            aria-label="Quantidade"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />

          {availableFlavors.length > 0 ? (
            <select
              aria-label="Sabor"
              value={flavor}
              onChange={(event) => setFlavor(event.target.value)}
            >
              <option value="">Escolha o sabor</option>
              {availableFlavors.map((item) => (
                <option value={item.name} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <div />
          )}
        </div>
      )}

      <div className={styles.heroActions}>
        {available && (
          <button className={styles.primaryButton} type="button" onClick={copy}>
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? "Pedido copiado" : "Copiar pedido"}
          </button>
        )}

        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => {
            setShowContact(true);
            void track(available ? "buy_intent" : "human_handoff");
          }}
        >
          {available ? <ShoppingBag size={16} /> : <MessageCircle size={16} />}
          {available ? "Quero comprar" : "Me avise / falar com a Candinho"}
        </button>
      </div>

      {showContact && (
        <PublicCatalogLeadForm
          productId={productId}
          contextSummary={message}
          source={available ? "catalog_product_buy" : "catalog_back_in_stock"}
        />
      )}
    </div>
  );
}
