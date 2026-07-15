"use client";

import { FileDown, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ProductCatalogActions() {
  const [includeIncoming, setIncludeIncoming] = useState(false);
  const href = `/api/catalogo/produtos${includeIncoming ? "?includeIncoming=1" : ""}`;

  return (
    <div className="product-page-actions">
      <label className="catalog-incoming-toggle">
        <input type="checkbox" checked={includeIncoming} onChange={(event) => setIncludeIncoming(event.target.checked)} />
        <span>Incluir a caminho</span>
      </label>
      <a className="button ghost" href={href}>
        <FileDown size={16} />Gerar catálogo PDF
      </a>
      <Link className="button gold" href="/produtos/novo"><Plus size={16} />Novo produto</Link>
    </div>
  );
}
