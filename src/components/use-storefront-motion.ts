"use client";
import { useSyncExternalStore } from "react";
function subscribe(listener: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", listener);
  return () => preference.removeEventListener("change", listener);
}
function snapshot() { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
export function useStorefrontMotion() {
  return { enabled: useSyncExternalStore(subscribe, snapshot, () => false) };
}
