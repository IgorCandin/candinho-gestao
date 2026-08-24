"use client";

import {
  CheckCircle2,
  ImageOff,
  Layers3,
  RotateCcw,
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

type NutritionView = "missing" | "existing" | "all";

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

    if (next !== text) {
      node.nodeValue = next;
    }

    node = walker.nextNode();
  }
}

function hasPhoto03(
  row: Rows[number],
) {
  return Boolean(
    typeof row.secondary_image_url === "string" &&
      row.secondary_image_url.trim(),
  );
}

export function MarketingNutritionWorkbenchV4545({
  rows,
}: {
  rows: Rows;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] =
    useState<NutritionView>("missing");

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

  const visibleRows = groups[view];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const refresh = () =>
      relabelNutritionWorkspace(root);

    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [view]);

  return (
    <div
      ref={rootRef}
      className="nutrition-v4549"
    >
      <section className="nutrition-v4549-switcher">
        <div className="nutrition-v4549-copy">
          <span className="nutrition-v4549-eyebrow">
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
              ? "Esta é a fila padrão. Aqui aparecem somente produtos que ainda não possuem Foto 03."
              : view === "existing"
                ? "Use esta área quando quiser revisar, refazer ou remover uma Foto 03 já existente."
                : "Visão completa para conferência. Nenhum produto é alterado apenas por aparecer aqui."}
          </p>
        </div>

        <div
          className="nutrition-v4549-tabs"
          role="tablist"
          aria-label="Visualização da Foto 03"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "missing"}
            className={
              view === "missing"
                ? "is-active"
                : undefined
            }
            onClick={() => setView("missing")}
          >
            <ImageOff size={16} />
            <span>Faltam</span>
            <strong>{groups.missing.length}</strong>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={view === "existing"}
            className={
              view === "existing"
                ? "is-active"
                : undefined
            }
            onClick={() => setView("existing")}
          >
            <CheckCircle2 size={16} />
            <span>Já possuem</span>
            <strong>{groups.existing.length}</strong>
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
            onClick={() => setView("all")}
          >
            <Layers3 size={16} />
            <span>Todos</span>
            <strong>{groups.all.length}</strong>
          </button>
        </div>
      </section>

      <div className="nutrition-v4549-status">
        <div>
          {view === "missing" ? (
            <ImageOff size={15} />
          ) : view === "existing" ? (
            <RotateCcw size={15} />
          ) : (
            <Layers3 size={15} />
          )}
          <span>
            <strong>{visibleRows.length}</strong>{" "}
            produto(s) nesta visualização
          </span>
        </div>

        {view === "existing" && (
          <small>
            Abra o card para refazer ou remover a
            Foto 03.
          </small>
        )}
      </div>

      <ProductNutritionWorkbench
        key={view}
        initialRows={visibleRows}
      />

      <style jsx global>{`
        .nutrition-v4549 {
          display: grid;
          gap: 16px;
          min-width: 0;
        }

        .nutrition-v4549-switcher {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          padding: 20px;
          border: 1px solid
            rgba(148, 163, 184, 0.16);
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 0 0,
              rgba(234, 179, 8, 0.08),
              transparent 38%
            ),
            rgba(12, 16, 24, 0.94);
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.18);
        }

        .nutrition-v4549-copy {
          min-width: 0;
        }

        .nutrition-v4549-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: #e9b949;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .nutrition-v4549-copy h2 {
          margin: 0;
          font-size: clamp(20px, 2vw, 27px);
          letter-spacing: -0.03em;
        }

        .nutrition-v4549-copy p {
          max-width: 720px;
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
        }

        .nutrition-v4549-tabs {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .nutrition-v4549-tabs button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid
            rgba(148, 163, 184, 0.18);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
          color: var(--muted);
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition:
            background 160ms ease,
            border-color 160ms ease,
            transform 160ms ease,
            color 160ms ease;
        }

        .nutrition-v4549-tabs button:hover {
          transform: translateY(-1px);
          border-color:
            rgba(233, 185, 73, 0.42);
          color: inherit;
        }

        .nutrition-v4549-tabs button.is-active {
          border-color:
            rgba(233, 185, 73, 0.6);
          background:
            rgba(233, 185, 73, 0.12);
          color: #f7d97e;
        }

        .nutrition-v4549-tabs strong {
          display: grid;
          min-width: 24px;
          height: 24px;
          place-items: center;
          padding: 0 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          color: currentColor;
          font-size: 11px;
        }

        .nutrition-v4549-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 44px;
          padding: 10px 14px;
          border: 1px solid
            rgba(148, 163, 184, 0.12);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.018);
        }

        .nutrition-v4549-status > div {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          font-size: 12px;
        }

        .nutrition-v4549-status small {
          color: var(--muted);
          font-size: 11px;
        }

        .nutrition-v4549
          .nutrition-workbench-kpis {
          display: none !important;
        }

        .nutrition-v4549
          .nutrition-workbench-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px !important;
          border: 1px solid
            rgba(148, 163, 184, 0.12);
          border-radius: 15px;
          background: rgba(12, 16, 24, 0.72);
        }

        .nutrition-v4549
          .nutrition-workbench-toolbar
          > div {
          display: flex;
          flex: 1 1 auto;
          gap: 10px;
          min-width: 0;
        }

        .nutrition-v4549
          .nutrition-workbench-toolbar
          label {
          display: flex;
          flex: 1 1 440px;
          align-items: center;
          gap: 8px;
          min-width: 220px;
          max-width: 620px;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid
            rgba(148, 163, 184, 0.16);
          border-radius: 12px;
          background: rgba(3, 7, 18, 0.58);
        }

        .nutrition-v4549
          .nutrition-workbench-toolbar
          input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: inherit;
        }

        .nutrition-v4549
          .nutrition-workbench-toolbar
          select {
          display: none !important;
        }

        .nutrition-v4549
          .nutrition-workbench-toolbar
          > strong {
          white-space: nowrap;
          color: var(--muted);
          font-size: 11px;
        }

        .nutrition-v4549
          .nutrition-flow-note {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px !important;
          border: 1px solid
            rgba(148, 163, 184, 0.1);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.018);
        }

        .nutrition-v4549
          .nutrition-card-grid {
          display: grid !important;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(min(100%, 360px), 1fr)
            ) !important;
          gap: 16px !important;
          align-items: start;
        }

        .nutrition-v4549
          .nutrition-workbench-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid
            rgba(148, 163, 184, 0.13) !important;
          border-radius: 18px !important;
          background: rgba(12, 16, 24, 0.78);
          box-shadow:
            0 12px 34px rgba(0, 0, 0, 0.13);
        }

        .nutrition-v4549
          .nutrition-workbench-card
          img {
          max-width: 100%;
          height: auto;
        }

        .nutrition-v4549
          .nutrition-workbench-card
          input,
        .nutrition-v4549
          .nutrition-workbench-card
          select,
        .nutrition-v4549
          .nutrition-workbench-card
          textarea {
          max-width: 100%;
        }

        @media (max-width: 860px) {
          .nutrition-v4549-switcher {
            grid-template-columns: 1fr;
          }

          .nutrition-v4549-tabs {
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .nutrition-v4549 {
            gap: 12px;
          }

          .nutrition-v4549-switcher {
            gap: 14px;
            padding: 15px;
            border-radius: 16px;
          }

          .nutrition-v4549-tabs {
            display: grid;
            grid-template-columns: 1fr;
          }

          .nutrition-v4549-tabs button {
            width: 100%;
            justify-content: flex-start;
          }

          .nutrition-v4549-tabs strong {
            margin-left: auto;
          }

          .nutrition-v4549-status {
            align-items: flex-start;
            flex-direction: column;
          }

          .nutrition-v4549
            .nutrition-workbench-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .nutrition-v4549
            .nutrition-workbench-toolbar
            > div {
            width: 100%;
          }

          .nutrition-v4549
            .nutrition-workbench-toolbar
            label {
            min-width: 0;
            max-width: none;
          }

          .nutrition-v4549
            .nutrition-workbench-toolbar
            > strong {
            padding-left: 2px;
          }

          .nutrition-v4549
            .nutrition-card-grid {
            grid-template-columns:
              minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
