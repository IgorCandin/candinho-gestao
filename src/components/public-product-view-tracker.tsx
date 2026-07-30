"use client";

import { useEffect } from "react";

function sessionId() {
  const key = "candinho:public-catalog-session";
  const current = window.sessionStorage.getItem(key);
  if (current) return current;

  const next =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(key, next);
  return next;
}

export function PublicProductViewTracker({
  productId,
}: {
  productId: string;
}) {
  useEffect(() => {
    void fetch("/api/catalogo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "product_view",
        product_id: productId,
        session_id: sessionId(),
        metadata: { placement: "product_page" },
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [productId]);

  return null;
}
