"use client";
import { useSyncExternalStore } from "react";
const key = "candinho:storefront-motion";
function subscribe(listener: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", listener);
  window.addEventListener("storefront-motion", listener);
  window.addEventListener("storage", listener);
  return () => { preference.removeEventListener("change", listener); window.removeEventListener("storefront-motion", listener); window.removeEventListener("storage", listener); };
}
let temporaryChoice: boolean | null = null;
function snapshot() {
  if (temporaryChoice !== null) return temporaryChoice;
  try { const value = localStorage.getItem(key); if (value) return value === "on"; } catch { /* System preference remains available. */ }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
export function useStorefrontMotion() {
  const enabled = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    temporaryChoice = !enabled;
    try { localStorage.setItem(key, enabled ? "off" : "on"); temporaryChoice = null; } catch { /* Keep the choice for this visit. */ }
    window.dispatchEvent(new Event("storefront-motion"));
  }
  return { enabled, toggle };
}
