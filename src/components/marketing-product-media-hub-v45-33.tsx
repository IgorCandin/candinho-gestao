/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  CheckSquare,
  Download,
  ImageOff,
  Images,
  Search,
  Square,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

export type MarketingProductMediaRow = {
  module: "supplements" | "fitness";
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  edit_href: string;
  description_missing: boolean;
  slots: Array<{
    key: string;
    label: string;
    url: string | null;
    required: boolean;
  }>;
};

function keyFor(row: MarketingProductMediaRow) {
  return `${row.module}:${row.id}`;
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function extensionFromUrl(url: string) {
  const clean = url.split("?")[0].toLowerCase();
  const match = clean.match(/\.(png|jpe?g|webp|gif)$/);
  return match?.[1]?.replace("jpeg", "jpg") ?? "jpg";
}

async function downloadOne(
  row: MarketingProductMediaRow,
  slot: MarketingProductMediaRow["slots"][number],
) {
  if (!slot.url) return false;

  const extension = extensionFromUrl(slot.url);
  const filename =
    `${safeFileName(row.name)}-${safeFileName(slot.label)}.${extension}`;

  const response = await fetch(
    `/api/marketing/product-images/download?src=${encodeURIComponent(
      slot.url,
    )}&filename=${encodeURIComponent(filename)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      payload.error ?? `Falha ao baixar ${row.name}.`,
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  return true;
}

export function MarketingProductMediaHubV4533({
  rows,
}: {
  rows: MarketingProductMediaRow[];
}) {
  const [module, setModule] =
    useState<"supplements" | "fitness">("supplements");
  const [selected, setSelected] =
    useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");

    return rows.filter((row) => {
      if (row.module !== module) return false;
      if (!q) return true;

      return `${row.name} ${row.category ?? ""} ${row.brand ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(q);
    });
  }, [rows, module, query]);

  const selectedRows = rows.filter((row) =>
    selected.has(keyFor(row)),
  );

  function toggle(row: MarketingProductMediaRow) {
    const key = keyFor(row);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of filtered) {
        next.add(keyFor(row));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function download(
    mode:
      | "photo1"
      | "photo2"
      | "photo3"
      | "extras"
      | "all",
  ) {
    if (selectedRows.length === 0) {
      setMessage("Selecione pelo menos um produto.");
      return;
    }

    const targets: Array<{
      row: MarketingProductMediaRow;
      slot: MarketingProductMediaRow["slots"][number];
    }> = [];

    for (const row of selectedRows) {
      const slots =
        mode === "all"
          ? row.slots.filter((slot) => Boolean(slot.url))
          : mode === "extras"
            ? row.slots.slice(1).filter((slot) => Boolean(slot.url))
            : row.slots.filter((slot) => slot.key === mode && slot.url);

      for (const slot of slots) {
        targets.push({ row, slot });
      }
    }

    if (targets.length === 0) {
      setMessage("Os selecionados não têm fotos nesse grupo.");
      return;
    }

    setDownloading(true);
    setMessage(
      `Preparando ${targets.length} arquivo(s)...`,
    );

    let success = 0;
    let failed = 0;

    try {
      for (const target of targets) {
        try {
          const ok = await downloadOne(target.row, target.slot);
          if (ok) success += 1;
        } catch {
          failed += 1;
        }

        await new Promise((resolve) =>
          window.setTimeout(resolve, 90),
        );
      }

      setMessage(
        `${success} foto(s) baixada(s)${
          failed ? ` · ${failed} com erro` : ""
        }.`,
      );
    } finally {
      setDownloading(false);
    }
  }

  const moduleRows = rows.filter((row) => row.module === module);
  const completePhoto1 = moduleRows.filter(
    (row) => Boolean(row.slots.find((slot) => slot.key === "photo1")?.url),
  ).length;

  const completePhoto2 = moduleRows.filter(
    (row) => Boolean(row.slots.find((slot) => slot.key === "photo2")?.url),
  ).length;

  const completePhoto3 = moduleRows.filter(
    (row) => Boolean(row.slots.find((slot) => slot.key === "photo3")?.url),
  ).length;

  return (
    <section className="marketing-product-media-v4533">
      <div className="marketing-product-media-kpis-v4533">
        <article>
          <span>Produtos</span>
          <strong>{moduleRows.length}</strong>
        </article>
        <article>
          <span>
            {module === "supplements"
              ? "Foto 01 · produto"
              : "Foto principal"}
          </span>
          <strong>
            {completePhoto1}/{moduleRows.length}
          </strong>
        </article>
        <article>
          <span>
            {module === "supplements"
              ? "Foto 02 · banner"
              : "Foto extra 01"}
          </span>
          <strong>
            {completePhoto2}/{moduleRows.length}
          </strong>
        </article>
        <article>
          <span>
            {module === "supplements"
              ? "Foto 03 · nutrição"
              : "Foto extra 02"}
          </span>
          <strong>
            {completePhoto3}/{moduleRows.length}
          </strong>
        </article>
      </div>

      <div className="marketing-product-media-toolbar-v4533">
        <div className="marketing-product-media-tabs-v4533">
          <button
            type="button"
            className={module === "supplements" ? "active" : ""}
            onClick={() => {
              setModule("supplements");
              setSelected(new Set());
            }}
          >
            Suplementos
          </button>
          <button
            type="button"
            className={module === "fitness" ? "active" : ""}
            onClick={() => {
              setModule("fitness");
              setSelected(new Set());
            }}
          >
            Fitness
          </button>
        </div>

        <label className="marketing-product-media-search-v4533">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto..."
          />
        </label>
      </div>

      <div className="marketing-product-media-batch-v4533">
        <div>
          <strong>{selectedRows.length} selecionado(s)</strong>
          <span>
            As ações abaixo baixam somente os produtos marcados.
          </span>
        </div>

        <div className="marketing-product-media-actions-v4533">
          <button
            className="button ghost"
            type="button"
            onClick={selectVisible}
          >
            <CheckSquare size={14} />
            Selecionar visíveis
          </button>

          <button
            className="button ghost"
            type="button"
            onClick={clearSelection}
          >
            Limpar
          </button>

          {module === "supplements" ? (
            <>
              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() => void download("photo1")}
              >
                <Download size={14} />
                Baixar Foto 01
              </button>
              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() => void download("photo2")}
              >
                <Download size={14} />
                Baixar Foto 02
              </button>
              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() => void download("photo3")}
              >
                <Download size={14} />
                Baixar Foto 03
              </button>
            </>
          ) : (
            <>
              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() => void download("photo1")}
              >
                <Download size={14} />
                Baixar principal
              </button>
              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() => void download("extras")}
              >
                <Download size={14} />
                Baixar extras
              </button>
            </>
          )}

          <button
            className="button gold"
            type="button"
            disabled={downloading}
            onClick={() => void download("all")}
          >
            <Images size={14} />
            Baixar todas
          </button>
        </div>
      </div>

      {message && (
        <p className="marketing-product-media-message-v4533">
          {message}
        </p>
      )}

      <div className="marketing-product-media-grid-v4533">
        {filtered.map((row) => {
          const checked = selected.has(keyFor(row));

          return (
            <article
              className={`marketing-product-media-card-v4533 ${
                checked ? "selected" : ""
              }`}
              key={keyFor(row)}
            >
              <button
                type="button"
                className="marketing-product-media-check-v4533"
                onClick={() => toggle(row)}
                aria-label={
                  checked ? "Desmarcar produto" : "Selecionar produto"
                }
              >
                {checked ? (
                  <CheckSquare size={19} />
                ) : (
                  <Square size={19} />
                )}
              </button>

              <div className="marketing-product-media-card-copy-v4533">
                <span>
                  {row.category ?? (row.module === "fitness" ? "Fitness" : "Suplementos")}
                </span>
                <h2>{row.name}</h2>
                {row.brand && <p>{row.brand}</p>}
              </div>

              <div className="marketing-product-media-slots-v4533">
                {row.slots.map((slot) => (
                  <div
                    className={`marketing-product-media-slot-v4533 ${
                      slot.url ? "ready" : "missing"
                    }`}
                    key={slot.key}
                  >
                    <span>{slot.label}</span>

                    <div>
                      {slot.url ? (
                        <img
                          src={slot.url}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ImageOff size={22} />
                      )}
                    </div>

                    <small>
                      {slot.url
                        ? "Pronta"
                        : slot.required
                          ? "Pendente"
                          : "Opcional"}
                    </small>
                  </div>
                ))}
              </div>

              <footer>
                <div>
                  {row.description_missing && (
                    <span className="badge orange">
                      Descrição pendente
                    </span>
                  )}
                </div>

                <Link
                  className="button ghost compact-button"
                  href={row.edit_href}
                >
                  Abrir cadastro
                </Link>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
