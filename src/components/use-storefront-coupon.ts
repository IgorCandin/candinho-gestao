"use client";
import { useSyncExternalStore } from "react";
import { cleanStorefrontCoupon } from "@/lib/storefront-selection-message";
const key = "candinho:storefront-coupon";
const event = "candinho:storefront-coupon-changed";
let fallback: string | null = null;
function snapshot() {
  if (fallback !== null) return fallback;
  try { return cleanStorefrontCoupon(sessionStorage.getItem(key) ?? ""); } catch { return ""; }
}
function subscribe(listener: () => void) {
  window.addEventListener(event, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(event, listener); window.removeEventListener("storage", listener); };
}
export function useStorefrontCoupon() {
  const coupon = useSyncExternalStore(subscribe, snapshot, () => "");
  function setCoupon(value: string) {
    const code = cleanStorefrontCoupon(value);
    try { if (code) sessionStorage.setItem(key, code); else sessionStorage.removeItem(key); fallback = null; } catch { fallback = code; }
    window.dispatchEvent(new Event(event));
  }
  return { coupon, setCoupon };
}
