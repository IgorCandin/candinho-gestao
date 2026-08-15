"use client";

export const DELIVERY_FINALIZATION_INTENT_KEY =
  "candinho:delivery-finalization-intent:v1";

export type DeliveryFinalizationIntent = {
  source: "budget-confirmed";
  deliveredOn: string;
  createdAt: number;
};

export function saveDeliveryFinalizationIntent(
  intent: Omit<DeliveryFinalizationIntent, "createdAt">,
) {
  try {
    window.sessionStorage.setItem(
      DELIVERY_FINALIZATION_INTENT_KEY,
      JSON.stringify({
        ...intent,
        createdAt: Date.now(),
      }),
    );
  } catch {
    // O fluxo continua funcional mesmo se o storage estiver indisponível.
  }
}

export function consumeDeliveryFinalizationIntent(
  maxAgeMs = 15 * 60 * 1000,
): DeliveryFinalizationIntent | null {
  try {
    const raw = window.sessionStorage.getItem(
      DELIVERY_FINALIZATION_INTENT_KEY,
    );
    if (!raw) return null;

    window.sessionStorage.removeItem(
      DELIVERY_FINALIZATION_INTENT_KEY,
    );

    const parsed = JSON.parse(raw) as Partial<DeliveryFinalizationIntent>;

    if (
      parsed.source !== "budget-confirmed" ||
      typeof parsed.deliveredOn !== "string" ||
      typeof parsed.createdAt !== "number" ||
      Date.now() - parsed.createdAt > maxAgeMs
    ) {
      return null;
    }

    return parsed as DeliveryFinalizationIntent;
  } catch {
    return null;
  }
}
