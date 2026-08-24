"use client";

import { useEffect, useRef } from "react";
import { ProductNutritionWorkbench } from "@/components/product-nutrition-workbench";

type Rows = React.ComponentProps<typeof ProductNutritionWorkbench>["initialRows"];

function relabelNutritionWorkspace(root: HTMLElement) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );

  const replacements: Array<[RegExp, string]> = [
    [/Imagem 2/g, "Foto 03"],
    [/imagem 2/g, "Foto 03"],
    [/Imagem atual/g, "Foto atual"],
  ];

  let node = walker.nextNode();
  while (node) {
    const text = node.nodeValue ?? "";
    let next = text;
    for (const [pattern, value] of replacements) {
      next = next.replace(pattern, value);
    }
    if (next !== text) node.nodeValue = next;
    node = walker.nextNode();
  }
}

export function MarketingNutritionWorkbenchV4545({
  rows,
}: {
  rows: Rows;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const refresh = () => relabelNutritionWorkspace(root);
    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      <ProductNutritionWorkbench initialRows={rows} />
    </div>
  );
}
