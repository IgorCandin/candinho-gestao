/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  CheckSquare,
  Download,
  ImageOff,
  ImagePlus,
  Images,
  LoaderCircle,
  RefreshCw,
  Search,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
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
    media_id?: string | null;
  }>;
};

type UploadTarget = {
  module: "supplements" | "fitness";
  productId: string;
  productName: string;
  slotKey: string;
  slotLabel: string;
  mediaId: string | null;
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

  window.setTimeout(
    () => URL.revokeObjectURL(objectUrl),
    1500,
  );

  return true;
}

export function MarketingProductMediaHubV4533({
  rows,
  canEditSupplements,
  canEditFitness,
}: {
  rows: MarketingProductMediaRow[];
  canEditSupplements: boolean;
  canEditFitness: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<UploadTarget | null>(null);

  const [liveRows, setLiveRows] =
    useState<MarketingProductMediaRow[]>(rows);
  const [module, setModule] =
    useState<"supplements" | "fitness">("supplements");
  const [selected, setSelected] =
    useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [uploadingKey, setUploadingKey] =
    useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLiveRows(rows);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");

    return liveRows.filter((row) => {
      if (row.module !== module) return false;
      if (!q) return true;

      return `${row.name} ${row.category ?? ""} ${row.brand ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(q);
    });
  }, [liveRows, module, query]);

  const selectedRows = liveRows.filter((row) =>
    selected.has(keyFor(row)),
  );

  function canEditRow(
    row: MarketingProductMediaRow,
  ) {
    return row.module === "supplements"
      ? canEditSupplements
      : canEditFitness;
  }

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

  function chooseUpload(
    row: MarketingProductMediaRow,
    slot: MarketingProductMediaRow["slots"][number],
  ) {
    if (!canEditRow(row) || uploadingKey) return;

    uploadTargetRef.current = {
      module: row.module,
      productId: row.id,
      productName: row.name,
      slotKey: slot.key,
      slotLabel: slot.label,
      mediaId: slot.media_id ?? null,
    };

    fileInputRef.current?.click();
  }

  async function uploadSelected(file?: File) {
    const target = uploadTargetRef.current;

    if (!file || !target) return;

    const uploadKey =
      `${target.module}:${target.productId}:${target.slotKey}`;

    setUploadingKey(uploadKey);
    setMessage(
      `Atualizando ${target.slotLabel} de ${target.productName}...`,
    );

    const form = new FormData();
    form.set("module", target.module);
    form.set("product_id", target.productId);
    form.set("slot", target.slotKey);
    form.set("file", file);

    if (target.mediaId) {
      form.set("media_id", target.mediaId);
    }

    try {
      const response = await fetch(
        "/api/marketing/product-images/upload",
        {
          method: "POST",
          body: form,
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        url?: string;
        media_id?: string | null;
        size_kb?: number;
      };

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error ??
            "Não foi possível atualizar a foto.",
        );
      }

      setLiveRows((current) =>
        current.map((row) => {
          if (
            row.module !== target.module ||
            row.id !== target.productId
          ) {
            return row;
          }

          return {
            ...row,
            slots: row.slots.map((slot) =>
              slot.key === target.slotKey
                ? {
                    ...slot,
                    url: payload.url ?? slot.url,
                    media_id:
                      payload.media_id ??
                      slot.media_id ??
                      null,
                  }
                : slot,
            ),
          };
        }),
      );

      setMessage(
        `${target.slotLabel} atualizada${
          payload.size_kb
            ? ` · ${payload.size_kb} KB`
            : ""
        }.`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a foto.",
      );
    } finally {
      setUploadingKey(null);
      uploadTargetRef.current = null;

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
            : row.slots.filter(
                (slot) =>
                  slot.key === mode &&
                  Boolean(slot.url),
              );

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
          const ok = await downloadOne(
            target.row,
            target.slot,
          );

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

  const moduleRows = liveRows.filter(
    (row) => row.module === module,
  );

  const completePhoto1 = moduleRows.filter(
    (row) =>
      Boolean(
        row.slots.find(
          (slot) => slot.key === "photo1",
        )?.url,
      ),
  ).length;

  const completePhoto2 = moduleRows.filter(
    (row) =>
      Boolean(
        row.slots.find(
          (slot) => slot.key === "photo2",
        )?.url,
      ),
  ).length;

  const completePhoto3 = moduleRows.filter(
    (row) =>
      Boolean(
        row.slots.find(
          (slot) => slot.key === "photo3",
        )?.url,
      ),
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
            className={
              module === "supplements"
                ? "active"
                : ""
            }
            onClick={() => {
              setModule("supplements");
              setSelected(new Set());
            }}
          >
            Suplementos
          </button>

          <button
            type="button"
            className={
              module === "fitness"
                ? "active"
                : ""
            }
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
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Buscar produto..."
          />
        </label>
      </div>

      <div className="marketing-product-media-batch-v4533">
        <div>
          <strong>
            {selectedRows.length} selecionado(s)
          </strong>
          <span>
            Selecione para baixar em lote. Para trocar uma foto,
            clique diretamente no quadrado dela.
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
                onClick={() =>
                  void download("photo1")
                }
              >
                <Download size={14} />
                Baixar Foto 01
              </button>

              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() =>
                  void download("photo2")
                }
              >
                <Download size={14} />
                Baixar Foto 02
              </button>

              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() =>
                  void download("photo3")
                }
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
                onClick={() =>
                  void download("photo1")
                }
              >
                <Download size={14} />
                Baixar principal
              </button>

              <button
                className="button ghost"
                type="button"
                disabled={downloading}
                onClick={() =>
                  void download("extras")
                }
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
          const checked =
            selected.has(keyFor(row));
          const editable = canEditRow(row);

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
                  checked
                    ? "Desmarcar produto"
                    : "Selecionar produto"
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
                  {row.category ??
                    (row.module === "fitness"
                      ? "Fitness"
                      : "Suplementos")}
                </span>
                <h2>{row.name}</h2>
                {row.brand && <p>{row.brand}</p>}
              </div>

              <div className="marketing-product-media-slots-v4533">
                {row.slots.map((slot) => {
                  const slotUploadKey =
                    `${row.module}:${row.id}:${slot.key}`;
                  const isUploading =
                    uploadingKey === slotUploadKey;

                  return (
                    <button
                      type="button"
                      className={`marketing-product-media-slot-v4533 marketing-product-media-slot-click-v4535 ${
                        slot.url ? "ready" : "missing"
                      } ${
                        editable
                          ? "editable"
                          : "readonly"
                      }`}
                      key={slot.key}
                      disabled={!editable || Boolean(uploadingKey)}
                      onClick={() =>
                        chooseUpload(row, slot)
                      }
                      title={
                        editable
                          ? slot.url
                            ? `Trocar ${slot.label}`
                            : `Adicionar ${slot.label}`
                          : "Sem permissão para editar"
                      }
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

                        {editable && (
                          <span className="marketing-product-media-slot-overlay-v4535">
                            {isUploading ? (
                              <LoaderCircle
                                className="spin"
                                size={18}
                              />
                            ) : slot.url ? (
                              <RefreshCw size={17} />
                            ) : (
                              <ImagePlus size={17} />
                            )}

                            {isUploading
                              ? "Enviando..."
                              : slot.url
                                ? "Trocar foto"
                                : "Adicionar foto"}
                          </span>
                        )}
                      </div>

                      <small>
                        {editable
                          ? slot.url
                            ? "Clique para trocar"
                            : slot.required
                              ? "Pendente · clique para adicionar"
                              : "Opcional · clique para adicionar"
                          : slot.url
                            ? "Pronta"
                            : slot.required
                              ? "Pendente"
                              : "Opcional"}
                      </small>
                    </button>
                  );
                })}
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

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) =>
          void uploadSelected(
            event.target.files?.[0],
          )
        }
      />
    </section>
  );
}
