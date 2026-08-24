"use client";

import {
  CheckCircle2,
  ImageOff,
  Layers3,
  RotateCcw,
  Search,
  Sparkles,
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

const PAGE_SIZE = 12;

function relabelNutritionWorkspace(
  root: HTMLElement,
) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );

  const replacements: Array<
    [RegExp, string]
  > = [
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

    if (next !== text) {
      node.nodeValue = next;
    }

    node = walker.nextNode();
  }
}

function hasPhoto03(row: Rows[number]) {
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
  const normalized = query
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (!normalized) return true;

  return String(row.name ?? "")
    .toLocaleLowerCase("pt-BR")
    .includes(normalized);
}

export function MarketingNutritionWorkbenchV4545({
  rows,
}: {
  rows: Rows;
}) {
  const rootRef =
    useRef<HTMLDivElement>(null);

  const [view, setView] =
    useState<NutritionView>("missing");

  const [query, setQuery] = useState("");
  const [limit, setLimit] =
    useState(PAGE_SIZE);

  const groups = useMemo(() => {
    const missing = rows.filter(
      (row) => !hasPhoto03(row),
    );

    const existing = rows.filter(
      (row) => hasPhoto03(row),
    );

    return {
      missing,
      existing,
      all: rows,
    };
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      groups[view].filter((row) =>
        matchesQuery(row, query),
      ),
    [groups, query, view],
  );

  const visibleRows = useMemo(
    () => filteredRows.slice(0, limit),
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
      window.requestAnimationFrame(() => {
        relabelNutritionWorkspace(root);
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [limit, query, view]);

  return (
    <div
      ref={rootRef}
      className="nutrition-v4550"
    >
      <section className="nutrition-v4550-switcher">
        <div className="nutrition-v4550-copy">
          <span className="nutrition-v4550-eyebrow">
            <Sparkles size={14} />
            Fila da Foto 03
          </span>

          <h2>
            {view === "missing"
              ? "Fazer primeiro o que ainda falta"
              : view === "existing"
                ? "Fotos 03 já cadastradas"
                : "Todos os produtos"}
          </h2>

          <p>
            {view === "missing"
              ? "A tela abre somente com produtos que ainda não possuem Foto 03."
              : view === "existing"
                ? "Aqui ficam os produtos que já possuem Foto 03 para revisar, refazer ou remover."
                : "Visão completa para conferência."}
          </p>
        </div>

        <div
          className="nutrition-v4550-tabs"
          role="tablist"
          aria-label="Visualização da Foto 03"
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
            <ImageOff size={16} />
            <span>Faltam</span>
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
            <CheckCircle2 size={16} />
            <span>Já possuem</span>
            <strong>
              {groups.existing.length}
            </strong>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === "all"}
            className={
              view === "all"
                ? "is-active"
                : undefined
            }
            onClick={() =>
              setView("all")
            }
          >
            <Layers3 size={16} />
            <span>Todos</span>
            <strong>
              {groups.all.length}
            </strong>
          </button>
        </div>
      </section>

      <section className="nutrition-v4550-tools">
        <label className="nutrition-v4550-search">
          <Search
            size={16}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
          />
        </label>

        <div className="nutrition-v4550-status">
          {view === "missing" ? (
            <ImageOff size={15} />
          ) : view === "existing" ? (
            <RotateCcw size={15} />
          ) : (
            <Layers3 size={15} />
          )}

          <span>
            Mostrando{" "}
            <strong>
              {visibleRows.length}
            </strong>{" "}
            de{" "}
            <strong>
              {filteredRows.length}
            </strong>
          </span>
        </div>
      </section>

      {visibleRows.length > 0 ? (
        <ProductNutritionWorkbench
          key={`${view}:${query}:${limit}`}
          initialRows={visibleRows}
        />
      ) : (
        <section className="nutrition-v4550-empty">
          <CheckCircle2 size={22} />
          <div>
            <strong>
              Nenhum produto nesta lista
            </strong>
            <p>
              Troque a visualização ou ajuste
              a busca.
            </p>
          </div>
        </section>
      )}

      {hasMore && (
        <div className="nutrition-v4550-more">
          <button
            type="button"
            className="button ghost"
            onClick={() =>
              setLimit(
                (current) =>
                  current + PAGE_SIZE,
              )
            }
          >
            Carregar mais {Math.min(
              PAGE_SIZE,
              filteredRows.length -
                visibleRows.length,
            )}
          </button>

          <small>
            Carregamento em lotes para não
            pesar o navegador.
          </small>
        </div>
      )}

      <style jsx global>{`
        .nutrition-v4550 {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .nutrition-v4550-switcher {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          padding: 18px;
          border: 1px solid
            rgba(148, 163, 184, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 0 0,
              rgba(234, 179, 8, 0.075),
              transparent 38%
            ),
            rgba(12, 16, 24, 0.94);
        }

        .nutrition-v4550-copy {
          min-width: 0;
        }

        .nutrition-v4550-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
          color: #e9b949;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .nutrition-v4550-copy h2 {
          margin: 0;
          font-size:
            clamp(20px, 2vw, 26px);
          letter-spacing: -0.03em;
        }

        .nutrition-v4550-copy p {
          max-width: 700px;
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .nutrition-v4550-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .nutrition-v4550-tabs button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 11px;
          border: 1px solid
            rgba(148, 163, 184, 0.18);
          border-radius: 12px;
          background:
            rgba(255, 255, 255, 0.025);
          color: var(--muted);
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .nutrition-v4550-tabs
          button.is-active {
          border-color:
            rgba(233, 185, 73, 0.58);
          background:
            rgba(233, 185, 73, 0.12);
          color: #f7d97e;
        }

        .nutrition-v4550-tabs strong {
          display: grid;
          min-width: 23px;
          height: 23px;
          place-items: center;
          padding: 0 6px;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.07);
          color: currentColor;
          font-size: 10px;
        }

        .nutrition-v4550-tools {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 12px;
          border: 1px solid
            rgba(148, 163, 184, 0.12);
          border-radius: 14px;
          background:
            rgba(12, 16, 24, 0.74);
        }

        .nutrition-v4550-search {
          display: flex;
          flex: 1 1 440px;
          align-items: center;
          gap: 8px;
          max-width: 620px;
          min-height: 40px;
          padding: 0 11px;
          border: 1px solid
            rgba(148, 163, 184, 0.16);
          border-radius: 11px;
          background:
            rgba(3, 7, 18, 0.58);
        }

        .nutrition-v4550-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 12px;
        }

        .nutrition-v4550-status {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--muted);
          font-size: 11px;
          white-space: nowrap;
        }

        .nutrition-v4550
          .nutrition-workbench-kpis,
        .nutrition-v4550
          .nutrition-workbench-toolbar {
          display: none !important;
        }

        .nutrition-v4550
          .nutrition-flow-note {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 12px !important;
          border: 1px solid
            rgba(148, 163, 184, 0.1);
          border-radius: 13px;
          background:
            rgba(255, 255, 255, 0.018);
        }

        .nutrition-v4550
          .nutrition-card-grid {
          display: grid !important;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(
                min(100%, 350px),
                1fr
              )
            ) !important;
          gap: 14px !important;
          align-items: start;
        }

        .nutrition-v4550
          .nutrition-workbench-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid
            rgba(148, 163, 184, 0.13) !important;
          border-radius: 17px !important;
          background:
            rgba(12, 16, 24, 0.78);
        }

        .nutrition-v4550
          .nutrition-workbench-card
          img {
          max-width: 100%;
          height: auto;
        }

        .nutrition-v4550-more {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          padding: 4px 0 10px;
        }

        .nutrition-v4550-more small {
          color: var(--muted);
          font-size: 10px;
        }

        .nutrition-v4550-empty {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 22px;
          border: 1px dashed
            rgba(148, 163, 184, 0.18);
          border-radius: 16px;
          color: var(--muted);
        }

        .nutrition-v4550-empty strong {
          color: inherit;
          font-size: 13px;
        }

        .nutrition-v4550-empty p {
          margin: 3px 0 0;
          font-size: 11px;
        }

        @media (max-width: 860px) {
          .nutrition-v4550-switcher {
            grid-template-columns: 1fr;
          }

          .nutrition-v4550-tabs {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .nutrition-v4550 {
            gap: 11px;
          }

          .nutrition-v4550-switcher {
            gap: 13px;
            padding: 14px;
            border-radius: 15px;
          }

          .nutrition-v4550-tabs {
            display: grid;
            grid-template-columns: 1fr;
          }

          .nutrition-v4550-tabs button {
            width: 100%;
            justify-content: flex-start;
          }

          .nutrition-v4550-tabs strong {
            margin-left: auto;
          }

          .nutrition-v4550-tools {
            align-items: stretch;
            flex-direction: column;
          }

          .nutrition-v4550-search {
            flex-basis: auto;
            max-width: none;
          }

          .nutrition-v4550-status {
            padding-left: 2px;
          }

          .nutrition-v4550
            .nutrition-card-grid {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
