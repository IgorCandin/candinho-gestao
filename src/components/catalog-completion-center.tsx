/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  CheckCircle2,
  CheckSquare,
  Edit3,
  ImageOff,
  LoaderCircle,
  Search,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ModuleName = "supplements" | "fitness";

type DraftPayload = {
  suggested_name?: string;
  suggested_brand?: string;
  suggested_category?: string;
  description?: string;
  objective?: string;
  ideal_profile?: string;
  information?: string;
  quick_message?: string;
  keywords?: string;
  normalization_notes?: string;
  confidence?: number;
};

type CompletionRow = {
  module: ModuleName;
  entity_id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  missing_fields: string[];
  ai_fields: string[];
  missing_count: number;
  completion_pct: number;
  edit_href: string;
  secondary_image_url: string | null;
  nutrition_status: string | null;
  draft_payload: DraftPayload | null;
  draft_status: string | null;
  draft_updated_at: string | null;
};

const moduleLabel = (module: ModuleName) =>
  module === "supplements" ? "Suplementos" : "Fitness";

function keyFor(row: CompletionRow) {
  return `${row.module}:${row.entity_id}`;
}

function chunk<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    result.push(values.slice(i, i + size));
  }
  return result;
}

function short(value?: string, limit = 220) {
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function DraftPreview({ row }: { row: CompletionRow }) {
  const draft = row.draft_payload;
  if (!draft || row.draft_status !== "draft") return null;

  return (
    <div className="catalog-completion-draft">
      <div className="catalog-completion-draft-head">
        <div>
          <span>Rascunho da IA</span>
          <strong>Revise antes de aplicar</strong>
        </div>
        <span>Confiança {draft.confidence ?? "—"}%</span>
      </div>

      <div className="catalog-standardization-preview">
        <strong>Padronização sugerida — não é aplicada automaticamente</strong>
        <p><span>Nome:</span> {draft.suggested_name || "sem sugestão"}</p>
        {row.module === "supplements" && (
          <p><span>Marca:</span> {draft.suggested_brand || "sem sugestão"}</p>
        )}
        <p><span>Categoria:</span> {draft.suggested_category || "sem sugestão"}</p>
        {draft.normalization_notes && <small>{draft.normalization_notes}</small>}
      </div>

      {draft.description && row.missing_fields.includes("Descrição") && (
        <div className="catalog-draft-field">
          <span>Descrição</span>
          <p>{short(draft.description)}</p>
        </div>
      )}

      {draft.objective && row.missing_fields.includes("Objetivo") && (
        <div className="catalog-draft-field">
          <span>Objetivo</span>
          <p>{short(draft.objective)}</p>
        </div>
      )}

      {draft.ideal_profile && row.missing_fields.includes("Perfil ideal") && (
        <div className="catalog-draft-field">
          <span>Perfil ideal</span>
          <p>{short(draft.ideal_profile)}</p>
        </div>
      )}

      {draft.information && row.missing_fields.includes("Informativo") && (
        <div className="catalog-draft-field">
          <span>Informativo</span>
          <p>{short(draft.information)}</p>
        </div>
      )}

      {draft.quick_message && row.missing_fields.includes("Mensagem rápida") && (
        <div className="catalog-draft-field">
          <span>Mensagem rápida</span>
          <p>{short(draft.quick_message)}</p>
        </div>
      )}

      {draft.keywords && row.missing_fields.includes("Palavras-chave") && (
        <div className="catalog-draft-field">
          <span>Palavras-chave</span>
          <p>{draft.keywords}</p>
        </div>
      )}
    </div>
  );
}

export function CatalogCompletionCenter({
  initialRows,
  initialModule,
}: {
  initialRows: CompletionRow[];
  initialModule: ModuleName | "all";
}) {
  const router = useRouter();
  const [moduleFilter, setModuleFilter] =
    useState<ModuleName | "all">(initialModule);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return initialRows.filter((row) => {
      const moduleOk = moduleFilter === "all" || row.module === moduleFilter;
      const queryOk =
        !q ||
        `${row.name} ${row.category} ${row.brand ?? ""} ${row.missing_fields.join(" ")}`
          .toLocaleLowerCase("pt-BR")
          .includes(q);
      return moduleOk && queryOk;
    });
  }, [initialRows, moduleFilter, query]);

  const selectedRows = initialRows.filter((row) =>
    selected.has(keyFor(row)),
  );

  const supplements = initialRows.filter((row) => row.module === "supplements");
  const fitness = initialRows.filter((row) => row.module === "fitness");
  const totalFields = initialRows.reduce((sum, row) => sum + row.missing_count, 0);
  const draftsReady = initialRows.filter(
    (row) => row.draft_status === "draft",
  ).length;

  function toggle(row: CompletionRow) {
    const key = keyFor(row);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectVisible() {
    setSelected(new Set(filtered.map(keyFor)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function generateRows(rows: CompletionRow[]) {
    if (rows.length === 0) {
      setMessage("Selecione pelo menos um produto.");
      return;
    }

    const generatable = rows.filter(
      (row) => row.ai_fields.length > 0 || !row.draft_payload,
    );

    if (generatable.length === 0) {
      setMessage(
        "Os produtos selecionados não têm campos de texto que a IA possa completar com segurança.",
      );
      return;
    }

    setLoading(true);
    setMessage(null);
    let success = 0;
    let failed = 0;

    try {
      const batches = chunk(generatable, 3);

      for (let index = 0; index < batches.length; index += 1) {
        setMessage(`Gerando lote ${index + 1} de ${batches.length}…`);

        const response = await fetch("/api/cadastros/completar/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: batches[index].map((row) => ({
              module: row.module,
              entityId: row.entity_id,
            })),
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          results?: Array<{ ok: boolean }>;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Falha no lote.");
        }

        for (const result of payload.results ?? []) {
          if (result.ok) success += 1;
          else failed += 1;
        }
      }

      setMessage(
        `${success} sugestão(ões) gerada(s)${failed ? ` · ${failed} com erro` : ""}. Revise antes de aplicar.`,
      );
      clearSelection();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível gerar as sugestões.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function applyOne(row: CompletionRow) {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "apply_catalog_completion_draft",
        {
          p_module: row.module,
          p_entity_id: row.entity_id,
        },
      );

      if (error) throw error;

      setMessage(`${row.name}: campos vazios preenchidos.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível aplicar a sugestão.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function applySelected() {
    const ready = selectedRows.filter(
      (row) => row.draft_status === "draft",
    );

    if (ready.length === 0) {
      setMessage("Nenhuma sugestão pronta entre os selecionados.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      let success = 0;

      for (const row of ready) {
        const { error } = await supabase.rpc(
          "apply_catalog_completion_draft",
          {
            p_module: row.module,
            p_entity_id: row.entity_id,
          },
        );
        if (error) throw error;
        success += 1;
      }

      setMessage(
        `${success} cadastro(s) atualizado(s). Somente campos que estavam vazios foram preenchidos.`,
      );
      clearSelection();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível aplicar o lote.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function discard(row: CompletionRow) {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await createClient().rpc(
        "discard_catalog_completion_draft",
        {
          p_module: row.module,
          p_entity_id: row.entity_id,
        },
      );

      if (error) throw error;
      setMessage(`${row.name}: sugestão descartada.`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível descartar.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="catalog-completion">
      <div className="catalog-completion-kpis">
        <article><span>Suplementos incompletos</span><strong>{supplements.length}</strong></article>
        <article><span>Fitness incompletos</span><strong>{fitness.length}</strong></article>
        <article><span>Campos pendentes</span><strong>{totalFields}</strong></article>
        <article><span>Sugestões para revisar</span><strong>{draftsReady}</strong></article>
      </div>

      <div className="catalog-completion-toolbar">
        <div className="catalog-completion-tabs">
          <button
            className={moduleFilter === "all" ? "active" : ""}
            type="button"
            onClick={() => setModuleFilter("all")}
          >
            Todos
          </button>
          <button
            className={moduleFilter === "supplements" ? "active" : ""}
            type="button"
            onClick={() => setModuleFilter("supplements")}
          >
            Suplementos
          </button>
          <button
            className={moduleFilter === "fitness" ? "active" : ""}
            type="button"
            onClick={() => setModuleFilter("fitness")}
          >
            Fitness
          </button>
        </div>

        <label className="catalog-completion-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou pendência..."
          />
        </label>
      </div>

      <div className="catalog-completion-batchbar">
        <div>
          <strong>{selectedRows.length} selecionado(s)</strong>
          <span>A IA gera rascunhos. Nada é salvo no produto sem sua aprovação.</span>
        </div>

        <div className="catalog-completion-batch-actions">
          <button className="button ghost" type="button" onClick={selectVisible}>
            <CheckSquare size={15} />
            Selecionar visíveis
          </button>

          <button className="button ghost" type="button" onClick={clearSelection}>
            Limpar seleção
          </button>

          <button
            className="button gold"
            type="button"
            disabled={loading || selectedRows.length === 0}
            onClick={() => void generateRows(selectedRows)}
          >
            {loading ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            Gerar sugestões com IA
          </button>

          <button
            className="button ghost"
            type="button"
            disabled={loading || selectedRows.length === 0}
            onClick={() => void applySelected()}
          >
            <CheckCircle2 size={15} />
            Aplicar sugestões prontas
          </button>
        </div>
      </div>

      {message && <p className="catalog-completion-message">{message}</p>}

      <div className="catalog-completion-list">
        {filtered.map((row) => {
          const checked = selected.has(keyFor(row));
          const hasDraft =
            row.draft_status === "draft" && Boolean(row.draft_payload);

          return (
            <article className="catalog-completion-card" key={keyFor(row)}>
              <button
                className="catalog-completion-check"
                type="button"
                aria-label={checked ? "Desmarcar produto" : "Selecionar produto"}
                onClick={() => toggle(row)}
              >
                {checked ? <CheckSquare size={19} /> : <Square size={19} />}
              </button>

              <div className="catalog-completion-product">
                <div className="catalog-completion-thumb">
                  {row.image_url ? (
                    <img src={row.image_url} alt="" loading="lazy" />
                  ) : (
                    <ImageOff size={25} />
                  )}
                </div>

                <div>
                  <span>{moduleLabel(row.module)}</span>
                  <h2>{row.name}</h2>
                  <p>
                    {row.category}
                    {row.brand ? ` · ${row.brand}` : ""}
                  </p>
                </div>

                <div className="catalog-completion-score">
                  <strong>{row.completion_pct}%</strong>
                  <span>completo</span>
                </div>
              </div>

              <div className="catalog-completion-missing">
                <strong>Falta preencher:</strong>
                <div>
                  {row.missing_fields.map((field) => (
                    <span key={field}>{field}</span>
                  ))}
                </div>
              </div>

              <DraftPreview row={row} />

              {hasDraft && (
                <div className="catalog-completion-draft-actions">
                  <button
                    className="button gold"
                    type="button"
                    disabled={loading}
                    onClick={() => void applyOne(row)}
                  >
                    <CheckCircle2 size={15} />
                    Aplicar somente campos vazios
                  </button>

                  <button
                    className="button ghost"
                    type="button"
                    disabled={loading}
                    onClick={() => void discard(row)}
                  >
                    <Trash2 size={15} />
                    Descartar rascunho
                  </button>
                </div>
              )}

              <div className="catalog-completion-actions">
                {row.module === "supplements" &&
                  row.missing_fields.includes("Imagem 2") && (
                    <Link
                      className="button gold"
                      href={`/produtos/nutricao?produto=${row.entity_id}`}
                    >
                      <Sparkles size={15} />
                      Nutrição IA / Gerar Imagem 2
                    </Link>
                  )}

                {row.ai_fields.length > 0 && (
                  <button
                    className="button ghost"
                    type="button"
                    disabled={loading}
                    onClick={() => void generateRows([row])}
                  >
                    <Sparkles size={15} />
                    {hasDraft ? "Gerar nova sugestão" : "Gerar sugestão"}
                  </button>
                )}

                <Link className="button ghost" href={row.edit_href}>
                  <Edit3 size={15} />
                  Editar manualmente
                </Link>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && (
          <article className="panel">
            <div className="panel-body">
              <p>Nenhum cadastro incompleto encontrado neste filtro.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
