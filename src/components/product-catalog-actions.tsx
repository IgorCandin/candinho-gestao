"use client";

import { BarChart3, CheckSquare, FileDown, Layers3, Plus, Search, Square } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductCatalogRow } from "@/lib/types";

type CatalogMode = "automatic" | "selected";

export function ProductCatalogActions({
  canWrite = true,
  products = [],
}: {
  canWrite?: boolean;
  products?: ProductCatalogRow[];
}) {
  const [step, setStep] = useState<"closed" | "mode" | "select" | "incoming">("closed");
  const [mode, setMode] = useState<CatalogMode>("automatic");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const activeProducts = useMemo(
    () =>
      products
        .filter((product) => product.active)
        .filter((product) => {
          const q = query.trim().toLocaleLowerCase("pt-BR");
          return !q || `${product.name} ${product.category} ${product.brand ?? ""}`.toLocaleLowerCase("pt-BR").includes(q);
        }),
    [products, query],
  );

  function close() {
    setStep("closed");
    setQuery("");
  }

  function chooseMode(nextMode: CatalogMode) {
    setMode(nextMode);
    if (nextMode === "selected") {
      setSelectedIds([]);
      setStep("select");
    } else {
      setStep("incoming");
    }
  }

  function toggleProduct(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function openCatalog(includeIncoming: boolean) {
    if (mode === "selected") {
      if (selectedIds.length === 0) return;
      const params = new URLSearchParams();
      params.set("ids", selectedIds.join(","));
      if (includeIncoming) params.set("includeIncoming", "1");
      window.open(`/api/catalogo/selecionados?${params.toString()}`, "_blank", "noopener,noreferrer");
    } else {
      const href = `/api/catalogo/produtos${includeIncoming ? "?includeIncoming=1" : ""}`;
      window.open(href, "_blank", "noopener,noreferrer");
    }
    close();
  }

  return (
    <>
      <div className="product-page-actions">
        <Link className="button ghost" href="/produtos/combos">
          <Layers3 size={16} />
          Combos
        </Link>

        {canWrite && (
          <Link className="button ghost" href="/produtos/gerencial">
            <BarChart3 size={16} />
            Área Gerencial
          </Link>
        )}

        {canWrite && (
          <button className="button ghost" type="button" onClick={() => setStep("mode")}>
            <FileDown size={16} />
            Gerar catálogo PDF
          </button>
        )}

        {canWrite && (
          <Link className="button gold" href="/produtos/novo">
            <Plus size={16} />
            Novo produto
          </Link>
        )}
      </div>

      {step !== "closed" && (
        <div
          role="presentation"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(6px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-options-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(620px, 100%)",
              maxHeight: "min(82vh, 760px)",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto minmax(0,1fr)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 18,
              background: "#10141c",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
            }}
          >
            <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--line)" }}>
              <h2 id="catalog-options-title" style={{ margin: 0, fontSize: 18 }}>
                Gerar catálogo PDF
              </h2>
              <p style={{ margin: "7px 0 0", opacity: 0.72, lineHeight: 1.5, fontSize: 12 }}>
                {step === "mode" && "Escolha entre montar um PDF específico para o cliente ou gerar o catálogo automático."}
                {step === "select" && "Marque somente os produtos que você quer enviar ao cliente."}
                {step === "incoming" && "Última escolha: o PDF pode incluir produtos que ainda estão a caminho."}
              </p>
            </div>

            <div style={{ padding: 24, overflowY: "auto" }}>
              {step === "mode" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <button className="button gold" type="button" onClick={() => chooseMode("selected")} style={{ minHeight: 54 }}>
                    <CheckSquare size={17} />
                    Selecionar produtos
                  </button>
                  <button className="button ghost" type="button" onClick={() => chooseMode("automatic")} style={{ minHeight: 54 }}>
                    <FileDown size={17} />
                    PDF automático
                  </button>
                  <button className="button ghost" type="button" onClick={close} style={{ opacity: 0.72 }}>
                    Cancelar
                  </button>
                </div>
              )}

              {step === "select" && (
                <div style={{ display: "grid", gap: 14 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 42,
                      padding: "0 12px",
                      border: "1px solid var(--line)",
                      borderRadius: 11,
                      background: "var(--panel)",
                    }}
                  >
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar produto..."
                      style={{ width: "100%", border: 0, outline: 0, background: "transparent", color: "var(--text)" }}
                    />
                  </label>

                  <div style={{ display: "grid", gap: 7, maxHeight: 390, overflowY: "auto", paddingRight: 3 }}>
                    {activeProducts.map((product) => {
                      const checked = selectedIds.includes(product.id);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto minmax(0,1fr) auto",
                            alignItems: "center",
                            gap: 10,
                            padding: "11px 12px",
                            border: `1px solid ${checked ? "rgba(217,164,65,.45)" : "var(--line)"}`,
                            borderRadius: 11,
                            background: checked ? "var(--gold-soft)" : "rgba(255,255,255,.018)",
                            color: "var(--text)",
                            textAlign: "left",
                          }}
                        >
                          {checked ? <CheckSquare size={17}/> : <Square size={17}/>}
                          <span style={{ minWidth: 0, display: "grid", gap: 2 }}>
                            <strong style={{ fontSize: 11 }}>{product.name}</strong>
                            <small style={{ color: "var(--muted)", fontSize: 9 }}>{product.category}{product.brand ? ` · ${product.brand}` : ""}</small>
                          </span>
                          <small style={{ color: "var(--muted)", fontSize: 9 }}>
                            {product.available_quantity} disp. · {product.incoming_quantity} caminho
                          </small>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ color: "var(--muted)", fontSize: 10, alignSelf: "center" }}>
                      {selectedIds.length} produto(s) selecionado(s)
                    </span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="button ghost" type="button" onClick={() => setStep("mode")}>Voltar</button>
                      <button
                        className="button gold"
                        type="button"
                        disabled={selectedIds.length === 0}
                        onClick={() => setStep("incoming")}
                        style={{ opacity: selectedIds.length === 0 ? 0.55 : 1 }}
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === "incoming" && (
                <div style={{ display: "grid", gap: 10 }}>
                  {mode === "selected" && (
                    <div
                      style={{
                        padding: 12,
                        border: "1px solid var(--line)",
                        borderRadius: 11,
                        color: "var(--muted)",
                        fontSize: 10,
                      }}
                    >
                      {selectedIds.length} produto(s) escolhidos para este catálogo.
                    </div>
                  )}
                  <button className="button gold" type="button" onClick={() => openCatalog(true)}>
                    Sim, incluir produtos a caminho
                  </button>
                  <button className="button ghost" type="button" onClick={() => openCatalog(false)}>
                    Não, somente disponíveis
                  </button>
                  <button className="button ghost" type="button" onClick={() => setStep(mode === "selected" ? "select" : "mode")}>
                    Voltar
                  </button>
                  <button className="button ghost" type="button" onClick={close} style={{ opacity: 0.72 }}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
