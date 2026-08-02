"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function FitnessUxScope() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    const previous = body.dataset.operationScope;

    if (pathname.startsWith("/fitness")) {
      body.dataset.operationScope = "fitness";
    } else if (body.dataset.operationScope === "fitness") {
      delete body.dataset.operationScope;
    }

    return () => {
      if (previous) {
        body.dataset.operationScope = previous;
      } else if (body.dataset.operationScope === "fitness") {
        delete body.dataset.operationScope;
      }
    };
  }, [pathname]);

  return null;
}
