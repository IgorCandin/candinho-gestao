"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileJson2,
  FolderUp,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  secondary_image_url: string | null;
  nutrition_status: string | null;
};

type ManifestItem = {
  file: string;
  product_id?: string;
  sku?: string;
  source_name?: string;
  source_url?: string;
  notes?: string;
};

type Manifest = {
  version?: number;
  slot?: string;
  batch?: string;
  items?: ManifestItem[];
};

type PreparedItem = {
  key: string;
  file: File;
  product: ProductRow | null;
  sourceName: string;
  sourceUrl: string;
  notes: string;
  state:
    | "ready"
    | "unknown"
    | "existing"
    | "uploading"
    | "done"
    | "error";
  error?: string;
};

function isImage(file: File) {
  return [
    "image/jpeg",
    "image/png",
    "image/webp",
  ].includes(file.type);
}

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function baseName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .trim();
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function parseManifest(
  files: File[],
): Promise<Manifest | null> {
  const manifestFile = files.find((file) =>
    /manifest.*\.json$/i.test(file.name),
  );

  if (!manifestFile) return null;

  try {
    const payload = JSON.parse(
      await manifestFile.text(),
    ) as Manifest;

    return payload &&
      typeof payload === "object" &&
      Array.isArray(payload.items)
      ? payload
      : null;
  } catch {
    return null;
  }
}

export function NutritionPhoto3BatchImporter({
  rows,
}: {
  rows: ProductRow[];
}) {
  const router = useRouter();
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<
    PreparedItem[]
  >([]);
  const [allowReplace, setAllowReplace] =
    useState(false);
  const [running, setRunning] =
    useState(false);
  const [message, setMessage] = useState<
    string | null
  >(null);

  const byId = useMemo(
    () =>
      new Map(
        rows.map((row) => [
          normalize(row.id),
          row,
        ]),
      ),
    [rows],
  );

  const bySku = useMemo(() => {
    const map = new Map<
      string,
      ProductRow
    >();

    for (const row of rows) {
      if (!row.sku) continue;
      map.set(normalize(row.sku), row);
    }

    return map;
  }, [rows]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      ready: items.filter(
        (item) => item.state === "ready",
      ).length,
      existing: items.filter(
        (item) => item.state === "existing",
      ).length,
      unknown: items.filter(
        (item) => item.state === "unknown",
      ).length,
      done: items.filter(
        (item) => item.state === "done",
      ).length,
      error: items.filter(
        (item) => item.state === "error",
      ).length,
    };
  }, [items]);

  async function prepare(
    selected: File[],
  ) {
    setMessage(null);

    const images =
      selected.filter(isImage);

    if (images.length === 0) {
      setItems([]);
      setMessage(
        "Selecione imagens PNG, JPG ou WEBP. Se o lote veio em ZIP, extraia primeiro e arraste os arquivos.",
      );
      return;
    }

    const manifest =
      await parseManifest(selected);

    const manifestByFile =
      new Map<string, ManifestItem>();

    for (const item of
      manifest?.items ?? []) {
      if (!item.file) continue;
      manifestByFile.set(
        normalize(item.file),
        item,
      );
    }

    const prepared =
      images.map<PreparedItem>((file) => {
        const manifestItem =
          manifestByFile.get(
            normalize(file.name),
          );

        const stem =
          baseName(file.name);

        const idCandidate =
          manifestItem?.product_id?.trim() ||
          (looksLikeUuid(stem)
            ? stem
            : "");

        const skuCandidate =
          manifestItem?.sku?.trim() ||
          stem.split("__")[0]?.trim() ||
          stem;

        const product =
          (idCandidate
            ? byId.get(
                normalize(idCandidate),
              )
            : null) ??
          bySku.get(
            normalize(skuCandidate),
          ) ??
          null;

        const existing =
          Boolean(
            product?.secondary_image_url,
          );

        return {
          key: `${file.name}:${file.size}:${file.lastModified}`,
          file,
          product,
          sourceName:
            manifestItem?.source_name?.trim() ??
            "",
          sourceUrl:
            manifestItem?.source_url?.trim() ??
            "",
          notes:
            manifestItem?.notes?.trim() ??
            "",
          state: !product
            ? "unknown"
            : existing
              ? "existing"
              : "ready",
        };
      });

    setItems(prepared);

    if (manifest) {
      setMessage(
        `Manifesto reconhecido${manifest.batch ? ` · ${manifest.batch}` : ""}. Confira os vínculos antes de aplicar.`,
      );
    }
  }

  async function onFiles(
    fileList: FileList | null,
  ) {
    if (!fileList) return;
    await prepare(Array.from(fileList));
  }

  function setItemState(
    key: string,
    patch: Partial<PreparedItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  async function uploadOne(
    item: PreparedItem,
  ) {
    if (!item.product) return false;

    const form = new FormData();
    form.set("module", "supplements");
    form.set(
      "product_id",
      item.product.id,
    );
    form.set("slot", "photo3");
    form.set("file", item.file);

    const response = await fetch(
      "/api/marketing/product-images/upload",
      {
        method: "POST",
        body: form,
      },
    );

    const payload = (await response
      .json()
      .catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.error ||
          "Não foi possível salvar a Foto 03.",
      );
    }

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "set_product_nutrition_metadata",
      {
        p_product_id:
          item.product.id,
        p_status: "review",
        p_source_name:
          item.sourceName || null,
        p_source_url:
          item.sourceUrl || null,
        p_notes:
          item.notes ||
          "Foto 03 importada em lote. Revisar antes de aprovar.",
      },
    );

    if (error) throw error;

    return true;
  }

  async function importBatch() {
    if (running) return;

    const candidates =
      items.filter((item) => {
        if (!item.product) return false;

        if (item.state === "ready") {
          return true;
        }

        return (
          allowReplace &&
          item.state === "existing"
        );
      });

    if (candidates.length === 0) {
      setMessage(
        "Não há imagens prontas para importar.",
      );
      return;
    }

    setRunning(true);
    setMessage(null);

    let ok = 0;
    let failed = 0;

    for (const item of candidates) {
      setItemState(item.key, {
        state: "uploading",
        error: undefined,
      });

      try {
        await uploadOne(item);
        ok += 1;
        setItemState(item.key, {
          state: "done",
        });
      } catch (error) {
        failed += 1;
        setItemState(item.key, {
          state: "error",
          error:
            error instanceof Error
              ? error.message
              : "Falha ao importar.",
        });
      }
    }

    setRunning(false);

    setMessage(
      failed === 0
        ? `${ok} Foto(s) 03 importada(s). Todas ficaram em revisão.`
        : `${ok} concluída(s) e ${failed} com erro. Os demais produtos não foram afetados.`,
    );

    router.refresh();
  }

  return (
    <section className="photo3-batch">
      <div className="photo3-batch-head">
        <div className="photo3-batch-icon">
          <FolderUp size={20} />
        </div>

        <div>
          <span>
            IMPORTAÇÃO EM LOTE
          </span>
          <h2>
            Subir pacote de Foto 03
          </h2>
          <p>
            Para os lotes feitos no
            ChatGPT/Work: extraia o ZIP,
            arraste as imagens junto do
            <code> manifest.json</code> e
            o ERP vincula cada arquivo ao
            produto certo.
          </p>
        </div>

        <button
          type="button"
          className="button gold"
          onClick={() =>
            inputRef.current?.click()
          }
          disabled={running}
        >
          <ImagePlus size={15} />
          Selecionar lote
        </button>

        <input
          ref={inputRef}
          hidden
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/json,.json"
          onChange={(event) =>
            void onFiles(
              event.target.files,
            )
          }
        />
      </div>

      <div
        className="photo3-dropzone"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect =
            "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          void prepare(
            Array.from(
              event.dataTransfer.files,
            ),
          );
        }}
      >
        <UploadCloud size={22} />
        <div>
          <strong>
            Arraste o lote aqui
          </strong>
          <span>
            Imagens + manifest.json.
            Sem manifesto, use nome
            <code> SKU.png</code> ou
            <code> product-id.png</code>.
          </span>
        </div>
      </div>

      {items.length > 0 && (
        <>
          <div className="photo3-summary">
            <span>
              Arquivos{" "}
              <strong>
                {summary.total}
              </strong>
            </span>
            <span className="ok">
              Prontos{" "}
              <strong>
                {summary.ready}
              </strong>
            </span>
            <span className="warn">
              Já possuem{" "}
              <strong>
                {summary.existing}
              </strong>
            </span>
            <span className="bad">
              Não reconhecidos{" "}
              <strong>
                {summary.unknown}
              </strong>
            </span>
            {summary.done > 0 && (
              <span className="done">
                Importados{" "}
                <strong>
                  {summary.done}
                </strong>
              </span>
            )}
          </div>

          <div className="photo3-list">
            {items.map((item) => (
              <article
                key={item.key}
                className={`photo3-item ${item.state}`}
              >
                <div className="photo3-state">
                  {item.state ===
                    "uploading" ? (
                    <LoaderCircle
                      size={17}
                      className="spin"
                    />
                  ) : item.state ===
                      "done" ? (
                    <CheckCircle2
                      size={17}
                    />
                  ) : item.state ===
                      "error" ||
                    item.state ===
                      "unknown" ? (
                    <XCircle size={17} />
                  ) : item.state ===
                      "existing" ? (
                    <RefreshCw
                      size={17}
                    />
                  ) : (
                    <FileJson2
                      size={17}
                    />
                  )}
                </div>

                <div className="photo3-item-copy">
                  <strong>
                    {item.product?.name ??
                      "Produto não reconhecido"}
                  </strong>
                  <span>
                    {item.file.name}
                    {item.product?.sku
                      ? ` · SKU ${item.product.sku}`
                      : ""}
                  </span>
                  {item.error && (
                    <small>
                      {item.error}
                    </small>
                  )}
                </div>

                <div className="photo3-item-status">
                  {item.state ===
                  "ready"
                    ? "Pronto"
                    : item.state ===
                        "existing"
                      ? "Já tem Foto 03"
                      : item.state ===
                          "unknown"
                        ? "Revisar vínculo"
                        : item.state ===
                            "uploading"
                          ? "Salvando..."
                          : item.state ===
                              "done"
                            ? "Importado"
                            : item.state ===
                                "error"
                              ? "Erro"
                              : item.state}
                </div>
              </article>
            ))}
          </div>

          <label className="photo3-replace">
            <input
              type="checkbox"
              checked={allowReplace}
              onChange={(event) =>
                setAllowReplace(
                  event.target.checked,
                )
              }
              disabled={running}
            />
            <span>
              Permitir substituir Foto 03
              dos produtos que já possuem
              uma imagem.
            </span>
          </label>

          <div className="photo3-actions">
            <button
              type="button"
              className="button gold"
              onClick={() =>
                void importBatch()
              }
              disabled={
                running ||
                summary.ready +
                  (allowReplace
                    ? summary.existing
                    : 0) ===
                  0
              }
            >
              {running ? (
                <LoaderCircle
                  size={15}
                  className="spin"
                />
              ) : (
                <UploadCloud
                  size={15}
                />
              )}
              {running
                ? "Importando..."
                : "Aplicar lote como Foto 03"}
            </button>

            <small>
              O upload é feito um produto
              por vez para não pesar o
              servidor. Depois fica em
              <strong> revisão</strong>,
              nunca aprovado
              automaticamente.
            </small>
          </div>
        </>
      )}

      {message && (
        <div className="photo3-message">
          <AlertTriangle size={15} />
          <span>{message}</span>
        </div>
      )}

      <style jsx global>{`
        .photo3-batch {
          display: grid;
          gap: 12px;
          margin-bottom: 16px;
          padding: 16px;
          border: 1px solid
            rgba(226, 172, 66, 0.18);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 0 0,
              rgba(226, 172, 66, 0.075),
              transparent 28%
            ),
            linear-gradient(
              145deg,
              rgba(15, 20, 28, 0.96),
              rgba(8, 12, 18, 0.96)
            );
        }

        .photo3-batch-head {
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr)
            auto;
          gap: 12px;
          align-items: center;
        }

        .photo3-batch-icon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 13px;
          background:
            rgba(226, 172, 66, 0.1);
          color: #e3b652;
        }

        .photo3-batch-head
          > div:nth-child(2)
          > span {
          display: block;
          color: #dda944;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.11em;
        }

        .photo3-batch-head h2 {
          margin: 2px 0 3px;
          font-size: 16px;
        }

        .photo3-batch-head p {
          max-width: 760px;
          margin: 0;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .photo3-batch code {
          padding: 1px 4px;
          border-radius: 5px;
          background:
            rgba(255, 255, 255, 0.045);
          color: #d6dbe3;
          font-size: 0.95em;
        }

        .photo3-dropzone {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 82px;
          padding: 14px;
          border: 1px dashed
            rgba(226, 172, 66, 0.28);
          border-radius: 14px;
          background:
            rgba(226, 172, 66, 0.025);
          color: #8d96a4;
        }

        .photo3-dropzone strong {
          display: block;
          color: #d6dbe3;
          font-size: 11px;
        }

        .photo3-dropzone span {
          display: block;
          margin-top: 3px;
          font-size: 9px;
        }

        .photo3-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .photo3-summary span {
          padding: 6px 8px;
          border-radius: 999px;
          background:
            rgba(255, 255, 255, 0.035);
          color: #98a1ae;
          font-size: 8px;
        }

        .photo3-summary .ok {
          color: #65d89a;
        }

        .photo3-summary .warn {
          color: #eab95a;
        }

        .photo3-summary .bad {
          color: #ff8b8b;
        }

        .photo3-summary .done {
          color: #83a8ff;
        }

        .photo3-list {
          display: grid;
          gap: 6px;
          max-height: 330px;
          overflow: auto;
          padding-right: 3px;
        }

        .photo3-item {
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr)
            auto;
          gap: 9px;
          align-items: center;
          padding: 9px 10px;
          border: 1px solid
            rgba(148, 163, 184, 0.09);
          border-radius: 11px;
          background:
            rgba(255, 255, 255, 0.014);
        }

        .photo3-item.done {
          border-color:
            rgba(71, 201, 126, 0.2);
        }

        .photo3-item.error,
        .photo3-item.unknown {
          border-color:
            rgba(244, 88, 88, 0.2);
        }

        .photo3-item.existing {
          border-color:
            rgba(226, 172, 66, 0.18);
        }

        .photo3-state {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border-radius: 8px;
          background:
            rgba(255, 255, 255, 0.035);
          color: #9aa3af;
        }

        .photo3-item-copy {
          min-width: 0;
        }

        .photo3-item-copy strong {
          display: block;
          overflow: hidden;
          color: #dfe3e9;
          font-size: 9px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .photo3-item-copy span,
        .photo3-item-copy small {
          display: block;
          overflow: hidden;
          margin-top: 2px;
          color: #747d89;
          font-size: 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .photo3-item-copy small {
          color: #ff9090;
        }

        .photo3-item-status {
          color: #848d99;
          font-size: 7px;
          white-space: nowrap;
        }

        .photo3-replace {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          color: #9199a5;
          font-size: 9px;
          line-height: 1.45;
        }

        .photo3-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .photo3-actions small {
          max-width: 610px;
          color: #747d89;
          font-size: 8px;
          line-height: 1.45;
        }

        .photo3-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 9px 10px;
          border: 1px solid
            rgba(226, 172, 66, 0.15);
          border-radius: 10px;
          background:
            rgba(226, 172, 66, 0.035);
          color: #b7bec8;
          font-size: 9px;
        }

        @media (max-width: 720px) {
          .photo3-batch-head {
            grid-template-columns:
              auto minmax(0, 1fr);
          }

          .photo3-batch-head
            > button {
            grid-column: 1 / -1;
            width: 100%;
          }

          .photo3-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .photo3-actions
            .button {
            width: 100%;
          }

          .photo3-item {
            grid-template-columns:
              auto minmax(0, 1fr);
          }

          .photo3-item-status {
            grid-column: 2;
          }
        }
      `}</style>
    </section>
  );
}
