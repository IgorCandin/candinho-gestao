"use client";

import { useEffect } from "react";

export function V459UiFoundationMarker() {
  useEffect(() => {
    document.body.classList.add("v459-erp");
    return () => document.body.classList.remove("v459-erp");
  }, []);

  return null;
}
