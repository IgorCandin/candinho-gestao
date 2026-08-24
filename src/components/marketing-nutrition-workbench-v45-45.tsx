"use client";

import {
  CheckCircle2,
  ImageOff,
  Layers3,
  RotateCcw,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { ProductNutritionWorkbench } from "@/components/product-nutrition-workbench";

type Rows = ComponentProps<
  typeof ProductNutritionWorkbench
>["initialRows"];

type NutritionView =
  | "missing"
  | "existing"
  | "all";

const PAGE_SIZE = 8;

function normalized(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function isNutritionApplicable(
  row: Rows[number],
) {
  const category = normalized(
    row.category,
  );
  const name = normalized(row.name);

  if (
    row.nutrition_status ===
    "not_applicable"
  ) {
    return false;
  }

  return ![
    "acessor",
    "coqueteleira",
    "squeeze",
    "shaker",
    "strap",
    "luva",
    "roupa",
    "vestuario",
  ].some(
    (token) =>
      category.includes(token) ||
      name.includes(token),
  );
}

function hasPhoto03(
  row: Rows[number],
) {
  return Boolean(
    typeof row.secondary_image_url ===
      "string" &&
      row.secondary_image_url.trim(),
  );
}

function matchesQuery(
  row: Rows[number],
  query: string,
) {
  const value =
    normalized(query).trim();

  if (!value) return true;

  return normalized(
    `${row.name} ${row.brand ?? ""} ${row.sku ?? ""}`,
  ).includes(value);
}

function relabelLegacyCopy(
  root: HTMLElement,
) {
  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
    );

  let node = walker.nextNode();

  while (node) {
    const text = node.nodeValue ?? "";

    const next = text
      .replaceAll(
        "Imagem 2",
        "Foto 03",
      )
      .replaceAll(
        "imagem 2",
        "Foto 03",
      );

    if (next !== text) {
      node.nodeValue = next;
    }

    node = walker.nextNode();
  }
}

export function MarketingNutritionWorkbenchV4545({
  rows,
}: {
  rows: Rows;
}) {
  const rootRef =
    useRef<HTMLDivElement>(null);

  const [view, setView] =
    useState<NutritionView>(
      "missing",
    );
  const [query, setQuery] =
    useState("");
  const [limit, setLimit] =
    useState(PAGE_SIZE);

  const nutritionRows =
    useMemo(
      () =>
        rows.filter(
          isNutritionApplicable,
        ),
      [rows],
    );

  const excludedCount =
    rows.length -
    nutritionRows.length;

  const groups = useMemo(() => {
    const missing =
      nutritionRows.filter(
        (row) =>
          !hasPhoto03(row),
      );

    const existing =
      nutritionRows.filter(
        hasPhoto03,
      );

    return {
      missing,
      existing,
      all: nutritionRows,
    };
  }, [nutritionRows]);

  const filteredRows =
    useMemo(
      () =>
        groups[view].filter(
          (row) =>
            matchesQuery(
              row,
              query,
            ),
        ),
      [groups, query, view],
    );

  const visibleRows =
    useMemo(
      () =>
        filteredRows.slice(
          0,
          limit,
        ),
      [filteredRows, limit],
    );

  const hasMore =
    visibleRows.length <
    filteredRows.length;

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [query, view]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const frame =
      window.requestAnimationFrame(
        () => {
          relabelLegacyCopy(root);
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [limit, query, view]);

  return (
    <div
      ref={rootRef}
      className="nutrition-v4551"
    >
      <section className="nutrition-v4551-hero">
        <div className="nutrition-v4551-hero-icon">
          <WandSparkles
            size={24}
          />
        </div>

        <div className="nutrition-v4551-hero-copy">
          <span>
            NEXUS · INTELIGÊNCIA DE PRODUTO
          </span>
          <h2>
            Foto 03 · Nutrição IA
          </h2>
          <p>
            Pesquisa a fonte oficial,
            organiza os dados do rótulo e
            prepara a Foto 03 para sua
            revisão antes de salvar.
          </p>
        </div>

        <div className="nutrition-v4551-hero-metric">
          <small>
            Pendentes agora
          </small>
          <strong>
            {groups.missing.length}
          </strong>
          <span>
            de {nutritionRows.length} produtos aplicáveis
          </span>
        </div>
      </section>

      <section className="nutrition-v4551-control">
        <div
          className="nutrition-v4551-tabs"
          role="tablist"
          aria-label="Fila da Foto 03"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              view === "missing"
            }
            className={
              view === "missing"
                ? "is-active"
                : undefined
            }
            onClick={() =>
              setView("missing")
            }
          >
            <ImageOff size={15} />
            <span>
              Para fazer
            </span>
            <strong>
              {groups.missing.length}
            </strong>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              view === "existing"
            }
            className={
              view === "existing"
                ? "is-active"
                : undefined
            }
            onClick={() =>
              setView("existing")
            }
          >
            <CheckCircle2 size={15} />
            <span>
              Já possuem
            </span>
            <strong>
              {groups.existing.length}
            </strong>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              view === "all"
            }
            className={
              view === "all"
                ? "is-active"
                : undefined
            }
            onClick={() =>
              setView("all")
            }
          >
            <Layers3 size={15} />
            <span>Todos</span>
            <strong>
              {groups.all.length}
            </strong>
          </button>
        </div>

        <label className="nutrition-v4551-search">
          <Search
            size={16}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Buscar produto, marca ou SKU..."
            aria-label="Buscar produto"
          />
        </label>
      </section>

      <div className="nutrition-v4551-context">
        <div>
          <Sparkles size={15} />
          <span>
            {view === "missing"
              ? "Mostrando primeiro somente o que ainda precisa da Foto 03."
              : view === "existing"
                ? "Aqui você pode revisar, refazer ou remover uma Foto 03 já cadastrada."
                : "Visão completa dos produtos que realmente precisam de informação nutricional."}
          </span>
        </div>

        <small>
          {excludedCount > 0
            ? `${excludedCount} acessório(s)/item(ns) não nutricionais ocultados`
            : "Acessórios não entram nesta fila"}
        </small>
      </div>

      <div className="nutrition-v4551-progress">
        <span>
          Exibindo{" "}
          <strong>
            {visibleRows.length}
          </strong>{" "}
          de{" "}
          <strong>
            {filteredRows.length}
          </strong>
        </span>

        <div aria-hidden="true">
          <i
            style={{
              width:
                filteredRows.length >
                0
                  ? `${Math.min(
                      100,
                      (visibleRows.length /
                        filteredRows.length) *
                        100,
                    )}%`
                  : "100%",
            }}
          />
        </div>
      </div>

      {visibleRows.length > 0 ? (
        <ProductNutritionWorkbench
          key={`${view}:${query}:${limit}`}
          initialRows={
            visibleRows
          }
        />
      ) : (
        <section className="nutrition-v4551-empty">
          <CheckCircle2
            size={24}
          />
          <div>
            <strong>
              Nada pendente nesta
              visualização
            </strong>
            <p>
              Troque a aba ou ajuste a
              busca.
            </p>
          </div>
        </section>
      )}

      {hasMore && (
        <div className="nutrition-v4551-more">
          <button
            type="button"
            className="button ghost"
            onClick={() =>
              setLimit(
                (current) =>
                  current +
                  PAGE_SIZE,
              )
            }
          >
            Carregar mais{" "}
            {Math.min(
              PAGE_SIZE,
              filteredRows.length -
                visibleRows.length,
            )}
          </button>
          <small>
            Carregamento em lotes para
            manter o ERP leve.
          </small>
        </div>
      )}

      <style jsx global>{`
        .nutrition-v4551 {
          --nutri-gold: #e2ac42;
          --nutri-gold-soft:
            rgba(226, 172, 66, 0.12);
          --nutri-blue:
            rgba(76, 110, 245, 0.11);
          display: grid;
          gap: 14px;
          min-width: 0;
          padding-bottom: 28px;
        }

        .nutrition-v4551-hero {
          position: relative;
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr)
            auto;
          gap: 16px;
          align-items: center;
          overflow: hidden;
          padding: 20px 22px;
          border: 1px solid
            rgba(226, 172, 66, 0.2);
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 8% 0,
              rgba(226, 172, 66, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(76, 110, 245, 0.1),
              transparent 34%
            ),
            linear-gradient(
              145deg,
              rgba(17, 22, 31, 0.98),
              rgba(8, 12, 18, 0.98)
            );
          box-shadow:
            0 18px 55px
              rgba(0, 0, 0, 0.2),
            inset 0 1px 0
              rgba(255, 255, 255, 0.03);
        }

        .nutrition-v4551-hero::after {
          content: "";
          position: absolute;
          right: -90px;
          top: -120px;
          width: 260px;
          height: 260px;
          border: 1px solid
            rgba(226, 172, 66, 0.08);
          border-radius: 50%;
          box-shadow:
            0 0 0 32px
              rgba(226, 172, 66, 0.025),
            0 0 0 64px
              rgba(226, 172, 66, 0.015);
          pointer-events: none;
        }

        .nutrition-v4551-hero-icon {
          display: grid;
          width: 50px;
          height: 50px;
          place-items: center;
          border: 1px solid
            rgba(226, 172, 66, 0.25);
          border-radius: 15px;
          background:
            rgba(226, 172, 66, 0.1);
          color: #f0c563;
          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.05);
        }

        .nutrition-v4551-hero-copy {
          min-width: 0;
        }

        .nutrition-v4551-hero-copy
          > span {
          display: block;
          margin-bottom: 4px;
          color: #e5b653;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .nutrition-v4551-hero-copy h2 {
          margin: 0;
          color: #f6f7fa;
          font-size:
            clamp(22px, 2.4vw, 31px);
          letter-spacing: -0.035em;
        }

        .nutrition-v4551-hero-copy p {
          max-width: 720px;
          margin: 6px 0 0;
          color: #959dab;
          font-size: 12px;
          line-height: 1.55;
        }

        .nutrition-v4551-hero-metric {
          position: relative;
          z-index: 1;
          display: grid;
          min-width: 150px;
          justify-items: end;
          padding: 10px 4px 10px 20px;
          border-left: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .nutrition-v4551-hero-metric
          small {
          color: #8e96a4;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .nutrition-v4551-hero-metric
          strong {
          margin: 2px 0;
          color: #f3c968;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .nutrition-v4551-hero-metric
          span {
          color: #747d8b;
          font-size: 9px;
        }

        .nutrition-v4551-control {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px;
          border: 1px solid
            rgba(148, 163, 184, 0.12);
          border-radius: 16px;
          background:
            rgba(11, 15, 22, 0.88);
          box-shadow:
            inset 0 1px 0
              rgba(255, 255, 255, 0.02);
        }

        .nutrition-v4551-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .nutrition-v4551-tabs button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 11px;
          border: 1px solid
            transparent;
          border-radius: 11px;
          background: transparent;
          color: #8e97a5;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition:
            color 140ms ease,
            background 140ms ease,
            border-color 140ms ease;
        }

        .nutrition-v4551-tabs
          button:hover {
          color: #dce1e8;
          background:
            rgba(255, 255, 255, 0.03);
        }

        .nutrition-v4551-tabs
          button.is-active {
          border-color:
            rgba(226, 172, 66, 0.28);
          background:
            rgba(226, 172, 66, 0.1);
          color: #efc86f;
        }

        .nutrition-v4551-tabs strong {
          display: grid;
          min-width: 22px;
          height: 22px;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.06);
          font-size: 9px;
        }

        .nutrition-v4551-search {
          display: flex;
          flex: 0 1 390px;
          align-items: center;
          gap: 8px;
          min-width: 220px;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid
            rgba(148, 163, 184, 0.13);
          border-radius: 11px;
          background:
            rgba(2, 6, 13, 0.48);
          color: #727b89;
        }

        .nutrition-v4551-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #e6e9ee;
          font: inherit;
          font-size: 11px;
        }

        .nutrition-v4551-context {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 43px;
          padding: 9px 13px;
          border: 1px solid
            rgba(148, 163, 184, 0.09);
          border-radius: 13px;
          background:
            rgba(255, 255, 255, 0.014);
        }

        .nutrition-v4551-context
          > div {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #aab1bd;
          font-size: 10px;
        }

        .nutrition-v4551-context
          svg {
          color: #d8a43e;
        }

        .nutrition-v4551-context
          small {
          color: #727b89;
          font-size: 9px;
          white-space: nowrap;
        }

        .nutrition-v4551-progress {
          display: grid;
          grid-template-columns:
            auto minmax(120px, 240px);
          gap: 12px;
          align-items: center;
          justify-content: end;
          color: #717a88;
          font-size: 9px;
        }

        .nutrition-v4551-progress
          > div {
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.05);
        }

        .nutrition-v4551-progress i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #b77a1f,
              #e8bd59
            );
        }

        .nutrition-v4551
          .nutrition-workbench {
          display: grid;
          gap: 13px;
        }

        .nutrition-v4551
          .nutrition-workbench-kpis,
        .nutrition-v4551
          .nutrition-workbench-toolbar,
        .nutrition-v4551
          .nutrition-ai-info-banner {
          display: none !important;
        }

        .nutrition-v4551
          .nutrition-workbench-list {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 14px;
          align-items: start;
        }

        .nutrition-v4551
          .nutrition-workbench-card {
          position: relative;
          display: grid;
          gap: 13px;
          min-width: 0;
          overflow: hidden;
          padding: 16px !important;
          border: 1px solid
            rgba(148, 163, 184, 0.12) !important;
          border-radius: 18px !important;
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(226, 172, 66, 0.055),
              transparent 26%
            ),
            linear-gradient(
              155deg,
              rgba(16, 21, 30, 0.96),
              rgba(8, 12, 18, 0.96)
            ) !important;
          box-shadow:
            0 13px 36px
              rgba(0, 0, 0, 0.14),
            inset 0 1px 0
              rgba(255, 255, 255, 0.025);
        }

        .nutrition-v4551
          .nutrition-workbench-card::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 2px;
          background:
            linear-gradient(
              180deg,
              #e0aa42,
              transparent 80%
            );
          opacity: 0.75;
        }

        .nutrition-v4551
          .nutrition-workbench-product {
          display: grid;
          grid-template-columns:
            74px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .nutrition-v4551
          .nutrition-workbench-thumb {
          display: grid;
          width: 74px !important;
          height: 74px !important;
          place-items: center;
          overflow: hidden;
          border: 1px solid
            rgba(255, 255, 255, 0.07);
          border-radius: 14px !important;
          background: #f5f5f3 !important;
        }

        .nutrition-v4551
          .nutrition-workbench-thumb
          img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .nutrition-v4551
          .nutrition-workbench-product
          span {
          color: #727c89;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.035em;
        }

        .nutrition-v4551
          .nutrition-workbench-product
          h2 {
          margin: 3px 0 2px !important;
          color: #f0f2f5;
          font-size: 14px !important;
          line-height: 1.25;
          letter-spacing: -0.015em;
        }

        .nutrition-v4551
          .nutrition-workbench-product
          p {
          margin: 0;
          color: #7f8896;
          font-size: 9px;
        }

        .nutrition-v4551
          .nutrition-workbench-status-line {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .nutrition-v4551
          .nutrition-workbench-status-line
          > span {
          padding: 5px 8px;
          border: 1px solid
            rgba(148, 163, 184, 0.1);
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.018);
          color: #8d96a3;
          font-size: 8px;
        }

        .nutrition-v4551
          .nutrition-state {
          border-color:
            rgba(226, 172, 66, 0.2) !important;
          color: #e2b45a !important;
        }

        .nutrition-v4551
          .nutrition-ai-primary-actions {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 7px;
        }

        .nutrition-v4551
          .nutrition-ai-primary-actions
          .button {
          justify-content: center;
          min-height: 38px;
          border-radius: 10px;
          font-size: 9px;
        }

        .nutrition-v4551
          .nutrition-ai-preview {
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid
            rgba(76, 110, 245, 0.14);
          border-radius: 13px;
          background:
            rgba(76, 110, 245, 0.035);
        }

        .nutrition-v4551
          .nutrition-ai-preview-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .nutrition-v4551
          .nutrition-ai-preview-head
          > div:first-child {
          display: grid;
          gap: 2px;
        }

        .nutrition-v4551
          .nutrition-ai-preview-head
          span,
        .nutrition-v4551
          .nutrition-ai-preview-head
          small {
          color: #818a97;
          font-size: 8px;
        }

        .nutrition-v4551
          .nutrition-ai-preview-head
          strong {
          font-size: 10px;
        }

        .nutrition-v4551
          .nutrition-ai-confidence {
          min-width: 72px;
          text-align: right;
        }

        .nutrition-v4551
          .nutrition-ai-confidence
          strong {
          color: #e5b653;
          font-size: 16px;
        }

        .nutrition-v4551
          .nutrition-ai-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .nutrition-v4551
          .nutrition-ai-chips
          span {
          padding: 4px 6px;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.04);
          color: #9ca4b0;
          font-size: 7px;
        }

        .nutrition-v4551
          .nutrition-ai-facts {
          display: grid;
          overflow: hidden;
          border: 1px solid
            rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }

        .nutrition-v4551
          .nutrition-ai-facts
          > div {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto auto;
          gap: 8px;
          align-items: center;
          padding: 7px 9px;
          border-bottom: 1px solid
            rgba(148, 163, 184, 0.07);
          font-size: 8px;
        }

        .nutrition-v4551
          .nutrition-ai-facts
          > div:last-child {
          border-bottom: 0;
        }

        .nutrition-v4551
          .nutrition-ai-copy {
          display: grid;
          gap: 6px;
          color: #9098a5;
          font-size: 8px;
          line-height: 1.45;
        }

        .nutrition-v4551
          .nutrition-ai-copy p {
          margin: 0;
        }

        .nutrition-v4551
          .nutrition-workbench-fields {
          display: grid;
          grid-template-columns:
            minmax(110px, 0.7fr)
            minmax(150px, 1fr);
          gap: 8px;
          padding: 10px;
          border: 1px solid
            rgba(148, 163, 184, 0.09);
          border-radius: 12px;
          background:
            rgba(255, 255, 255, 0.012);
        }

        .nutrition-v4551
          .nutrition-workbench-fields
          label {
          display: grid;
          gap: 5px;
          min-width: 0;
          color: #7e8794;
          font-size: 8px;
          font-weight: 750;
        }

        .nutrition-v4551
          .nutrition-workbench-fields
          .nutrition-field-wide {
          grid-column: 1 / -1;
        }

        .nutrition-v4551
          .nutrition-workbench-fields
          input,
        .nutrition-v4551
          .nutrition-workbench-fields
          select,
        .nutrition-v4551
          .nutrition-workbench-fields
          textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 8px 9px;
          border: 1px solid
            rgba(148, 163, 184, 0.12);
          border-radius: 9px;
          outline: 0;
          background: #090e15;
          color: #e0e4ea;
          font: inherit;
          font-size: 9px;
        }

        .nutrition-v4551
          .nutrition-workbench-fields
          textarea {
          min-height: 62px;
          resize: vertical;
        }

        .nutrition-v4551
          .nutrition-workbench-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .nutrition-v4551
          .nutrition-workbench-actions
          .button {
          min-height: 34px;
          padding-inline: 9px;
          border-radius: 9px;
          font-size: 8px;
        }

        .nutrition-v4551
          .nutrition-workbench-message {
          margin: 0;
          padding: 8px 9px;
          border: 1px solid
            rgba(226, 172, 66, 0.1);
          border-radius: 9px;
          background:
            rgba(226, 172, 66, 0.035);
          color: #b9c0ca;
          font-size: 8px;
          line-height: 1.45;
        }

        .nutrition-v4551
          .nutrition-image-preview-panel {
          display: grid;
          gap: 9px;
          padding: 10px;
          border: 1px solid
            rgba(226, 172, 66, 0.16);
          border-radius: 12px;
          background:
            rgba(226, 172, 66, 0.025);
        }

        .nutrition-v4551
          .nutrition-image-preview-frame {
          width: min(
            100%,
            380px
          );
          max-height: 380px;
          margin-inline: auto;
          overflow: hidden;
          border-radius: 10px;
          background: #fff;
        }

        .nutrition-v4551
          .nutrition-image-preview-frame
          img {
          width: 100%;
          max-height: 380px;
          object-fit: contain;
        }

        .nutrition-v4551-more {
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 6px;
          padding: 2px 0 10px;
        }

        .nutrition-v4551-more small {
          color: #6f7885;
          font-size: 9px;
        }

        .nutrition-v4551-empty {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px;
          border: 1px dashed
            rgba(148, 163, 184, 0.16);
          border-radius: 17px;
          background:
            rgba(255, 255, 255, 0.01);
          color: #7e8794;
        }

        .nutrition-v4551-empty
          strong {
          color: #c9ced6;
          font-size: 12px;
        }

        .nutrition-v4551-empty p {
          margin: 3px 0 0;
          font-size: 10px;
        }

        @media (max-width: 1100px) {
          .nutrition-v4551
            .nutrition-workbench-list {
            grid-template-columns:
              minmax(0, 1fr);
          }
        }

        @media (max-width: 780px) {
          .nutrition-v4551-hero {
            grid-template-columns:
              auto minmax(0, 1fr);
          }

          .nutrition-v4551-hero-metric {
            grid-column: 1 / -1;
            justify-items: start;
            padding:
              12px 0 0;
            border-top: 1px solid
              rgba(255, 255, 255, 0.07);
            border-left: 0;
          }

          .nutrition-v4551-control {
            align-items: stretch;
            flex-direction: column;
          }

          .nutrition-v4551-search {
            max-width: none;
          }

          .nutrition-v4551-context {
            align-items: flex-start;
            flex-direction: column;
          }

          .nutrition-v4551-context
            small {
            white-space: normal;
          }
        }

        @media (max-width: 560px) {
          .nutrition-v4551-hero {
            padding: 15px;
            border-radius: 16px;
          }

          .nutrition-v4551-hero-icon {
            width: 42px;
            height: 42px;
          }

          .nutrition-v4551-tabs {
            display: grid;
            grid-template-columns:
              1fr;
            width: 100%;
          }

          .nutrition-v4551-tabs
            button {
            width: 100%;
            justify-content:
              flex-start;
          }

          .nutrition-v4551-tabs
            strong {
            margin-left: auto;
          }

          .nutrition-v4551-progress {
            grid-template-columns:
              1fr;
          }

          .nutrition-v4551
            .nutrition-ai-primary-actions,
          .nutrition-v4551
            .nutrition-workbench-fields {
            grid-template-columns:
              minmax(0, 1fr);
          }

          .nutrition-v4551
            .nutrition-workbench-fields
            .nutrition-field-wide {
            grid-column: auto;
          }

          .nutrition-v4551
            .nutrition-ai-primary-actions
            .button,
          .nutrition-v4551
            .nutrition-workbench-actions
            .button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
