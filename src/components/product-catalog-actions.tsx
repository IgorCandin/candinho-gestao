"use client";

import { FileDown, Layers3, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ProductCatalogActions() {
  const [showCatalogOptions, setShowCatalogOptions] = useState(false);

  function openCatalog(includeIncoming: boolean) {
    const href = `/api/catalogo/produtos${includeIncoming ? "?includeIncoming=1" : ""}`;
    window.open(href, "_blank", "noopener,noreferrer");
    setShowCatalogOptions(false);
  }

  return (
    <>
      <div className="product-page-actions">
        <Link className="button ghost" href="/produtos/combos">
          <Layers3 size={16} />
          Combos
        </Link>
        <button className="button ghost" type="button" onClick={() => setShowCatalogOptions(true)}>
          <FileDown size={16} />
          Gerar catálogo PDF
        </button>

        <Link className="button gold" href="/produtos/novo">
          <Plus size={16} />
          Novo produto
        </Link>
      </div>

      {showCatalogOptions && (
        <div
          role="presentation"
          onClick={() => setShowCatalogOptions(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.68)",
            backdropFilter: "blur(5px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-options-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(460px, 100%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 18,
              padding: 24,
              background: "#10141c",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
            }}
          >
            <h2 id="catalog-options-title" style={{ marginTop: 0, marginBottom: 8 }}>
              Gerar catálogo PDF
            </h2>
            <p style={{ marginTop: 0, marginBottom: 22, opacity: 0.72, lineHeight: 1.5 }}>
              Deseja incluir também os produtos que estão a caminho?
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              <button className="button gold" type="button" onClick={() => openCatalog(true)}>
                Sim, incluir a caminho
              </button>
              <button className="button ghost" type="button" onClick={() => openCatalog(false)}>
                Não, somente disponíveis
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => setShowCatalogOptions(false)}
                style={{ opacity: 0.72 }}
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
