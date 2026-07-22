/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { renderNutritionCardToBlobs } from "@/lib/nutrition-image-client";

type NutritionStatus =
  | "pending"
  | "researching"
  | "review"
  | "approved"
  | "not_applicable";

type NutritionFact = {
  label: string;
  amount: string;
  daily_value: string;
};

type NutritionResearch = {
  confirmed_product_name: string;
  confirmed_brand: string;
  variant_details: string;
  product_match_status:
    | "exact"
    | "probable"
    | "ambiguous"
    | "not_found";
  confidence: number;
  source_classification:
    | "official_brand"
    | "official_manufacturer"
    | "official_document"
    | "retailer"
    | "marketplace"
    | "other"
    | "not_found";
  source_name: string;
  source_title: string;
  source_url: string;
  serving_size: string;
  servings_per_container: string;
  nutrition_facts: NutritionFact[];
  ingredients: string;
  allergens: string;
  usage: string;
  warnings: string;
  variant_warning: string;
  research_notes: string;
  can_generate_image: boolean;
};

type NutritionRow = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string;
  restricted: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
  secondary_image_url: string | null;
  secondary_thumbnail_url: string | null;
  nutrition_status: NutritionStatus;
  nutrition_source_name: string | null;
  nutrition_source_url: string | null;
  nutrition_source_checked_at: string | null;
  nutrition_reviewed_at: string | null;
  nutrition_notes: string | null;
  priority_rank: number;
  research_query: string;
  nutrition_ai_payload: NutritionResearch | null;
  nutrition_ai_model: string | null;
  nutrition_ai_researched_at: string | null;
  nutrition_match_status: string | null;
  nutrition_match_confidence: number | null;
  nutrition_variant_warning: string | null;
  nutrition_image_generated_at: string | null;
};

const STATUS_OPTIONS: Array<{
  value: NutritionStatus;
  label: string;
}> = [
  { value: "pending", label: "A pesquisar" },
  { value: "researching", label: "Pesquisando" },
  { value: "review", label: "Em revisão" },
  { value: "approved", label: "Aprovado" },
  { value: "not_applicable", label: "Não se aplica" },
];

function statusLabel(value: NutritionStatus) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function matchLabel(value?: string | null) {
  if (value === "exact") return "Correspondência exata";
  if (value === "probable") return "Correspondência provável";
  if (value === "ambiguous") return "Produto/versão ambígua";
  if (value === "not_found") return "Fonte exata não encontrada";
  return "Ainda não pesquisado";
}

function sourceLabel(value?: string | null) {
  if (value === "official_brand") return "Marca oficial";
  if (value === "official_manufacturer") return "Fabricante oficial";
  if (value === "official_document") return "Documento oficial";
  if (value === "retailer") return "Varejista";
  if (value === "marketplace") return "Marketplace";
  if (value === "not_found") return "Não encontrada";
  return "Outra fonte";
}

function buildResearchPrompt(row: NutritionRow) {
  return [
    "Pesquise a informação nutricional oficial e atual deste produto.",
    "",
    `Produto: ${row.name}`,
    `Marca/origem cadastrada: ${row.brand ?? "não informada"}`,
    `SKU interno Candinho: ${row.sku ?? "sem SKU"}`,
    `Categoria: ${row.category}`,
    row.image_url
      ? `Imagem principal de referência: ${row.image_url}`
      : "Imagem principal: não cadastrada",
    "",
    "Priorize site oficial da marca/fabricante. Confirme versão, gramatura, sabor e apresentação. Não use marketplace como fonte principal e não invente valores ausentes.",
  ].join("\n");
}

function storagePath(url: string | null) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);

  return index >= 0
    ? decodeURIComponent(url.slice(index + marker.length))
    : null;
}

function ResearchPreview({
  research,
}: {
  research: NutritionResearch;
}) {
  return (
    <div className="nutrition-ai-preview">
      <div className="nutrition-ai-preview-head">
        <div>
          <span>Resultado da pesquisa</span>
          <strong>
            {research.confirmed_product_name || "Produto não confirmado"}
          </strong>
          <small>{research.confirmed_brand || "Marca não confirmada"}</small>
        </div>

        <div
          className={`nutrition-ai-confidence ${research.product_match_status}`}
        >
          <strong>{research.confidence}%</strong>
          <span>{matchLabel(research.product_match_status)}</span>
        </div>
      </div>

      <div className="nutrition-ai-chips">
        <span>{sourceLabel(research.source_classification)}</span>
        {research.serving_size && (
          <span>Porção: {research.serving_size}</span>
        )}
        {research.servings_per_container && (
          <span>{research.servings_per_container}</span>
        )}
      </div>

      {(research.variant_warning || research.research_notes) && (
        <div className="nutrition-ai-warning">
          <AlertTriangle size={16} />
          <div>
            {research.variant_warning && (
              <strong>{research.variant_warning}</strong>
            )}
            {research.research_notes && <p>{research.research_notes}</p>}
          </div>
        </div>
      )}

      {research.nutrition_facts.length > 0 && (
        <div className="nutrition-ai-facts">
          {research.nutrition_facts.slice(0, 8).map((fact, index) => (
            <div key={`${fact.label}-${index}`}>
              <span>{fact.label}</span>
              <strong>{fact.amount}</strong>
              <small>{fact.daily_value}</small>
            </div>
          ))}
        </div>
      )}

      {(research.ingredients || research.allergens) && (
        <div className="nutrition-ai-copy">
          {research.ingredients && (
            <p>
              <strong>Ingredientes:</strong> {research.ingredients}
            </p>
          )}
          {research.allergens && (
            <p>
              <strong>Alergênicos:</strong> {research.allergens}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ProductNutritionCard({ row }: { row: NutritionRow }) {
  const router = useRouter();

  const [status, setStatus] = useState<NutritionStatus>(
    row.nutrition_status,
  );
  const [sourceName, setSourceName] = useState(
    row.nutrition_source_name ?? "",
  );
  const [sourceUrl, setSourceUrl] = useState(
    row.nutrition_source_url ?? "",
  );
  const [notes, setNotes] = useState(row.nutrition_notes ?? "");
  const [research, setResearch] = useState<NutritionResearch | null>(
    row.nutrition_ai_payload ?? null,
  );
  const [hasImage, setHasImage] = useState(
    Boolean(row.secondary_image_url),
  );
  const [currentSecondaryImage, setCurrentSecondaryImage] = useState(
    row.secondary_image_url,
  );
  const [currentSecondaryThumbnail, setCurrentSecondaryThumbnail] = useState(
    row.secondary_thumbnail_url,
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFullBlob, setPreviewFullBlob] = useState<Blob | null>(null);
  const [previewThumbBlob, setPreviewThumbBlob] = useState<Blob | null>(null);

  const [researchLoading, setResearchLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setPreviewFullBlob(null);
    setPreviewThumbBlob(null);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(buildResearchPrompt(row));
    setMessage("Prompt de pesquisa copiado.");
  }

  async function researchWithAi() {
    setResearchLoading(true);
    setMessage(null);
    setStatus("researching");
    clearPreview();

    try {
      const response = await fetch("/api/produtos/nutricao/pesquisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: row.id }),
      });

      const payload = (await response.json()) as {
        error?: string;
        research?: NutritionResearch;
      };

      if (!response.ok || !payload.research) {
        throw new Error(
          payload.error || "A pesquisa não retornou dados.",
        );
      }

      setResearch(payload.research);
      setSourceName(payload.research.source_name || "");
      setSourceUrl(payload.research.source_url || "");
      setStatus("review");

      setMessage(
        payload.research.can_generate_image
          ? "Pesquisa concluída. Gere a prévia da Imagem 2, confira e só depois salve."
          : "Pesquisa concluída, mas a correspondência precisa de revisão antes de gerar a Imagem 2.",
      );

      router.refresh();
    } catch (error) {
      setStatus(row.nutrition_status);
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível pesquisar com IA.",
      );
    } finally {
      setResearchLoading(false);
    }
  }

  async function generatePreview() {
    if (!research) {
      setMessage("Pesquise o produto com IA antes de gerar a Imagem 2.");
      return;
    }

    setImageLoading(true);
    setMessage(null);

    try {
      const rendered = await renderNutritionCardToBlobs(row.name, research);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const nextUrl = URL.createObjectURL(rendered.full);

      setPreviewFullBlob(rendered.full);
      setPreviewThumbBlob(rendered.thumbnail);
      setPreviewUrl(nextUrl);
      setMessage(
        "Prévia gerada no navegador. Confira os textos e números antes de salvar como Imagem 2.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a prévia da Imagem 2.",
      );
    } finally {
      setImageLoading(false);
    }
  }

  async function saveGeneratedImage() {
    if (!previewFullBlob || !previewThumbBlob) {
      setMessage("Gere e confira a prévia antes de salvar a Imagem 2.");
      return;
    }

    setImageLoading(true);
    setMessage(null);

    const supabase = createClient();
    const token = crypto.randomUUID();

    const fullPath = `${row.id}/secondary-browser-${token}.png`;
    const thumbPath = `${row.id}/secondary-browser-${token}-thumb.webp`;

    try {
      const { error: fullError } = await supabase.storage
        .from("product-images")
        .upload(fullPath, previewFullBlob, {
          contentType: "image/png",
          upsert: false,
        });

      if (fullError) throw fullError;

      const { error: thumbError } = await supabase.storage
        .from("product-images")
        .upload(thumbPath, previewThumbBlob, {
          contentType: "image/webp",
          upsert: false,
        });

      if (thumbError) {
        await supabase.storage.from("product-images").remove([fullPath]);
        throw thumbError;
      }

      const fullUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(fullPath).data.publicUrl;

      const thumbUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(thumbPath).data.publicUrl;

      const { error: imageSaveError } = await supabase.rpc(
        "set_product_image",
        {
          p_product_id: row.id,
          p_slot: "secondary",
          p_image_url: fullUrl,
          p_thumbnail_url: thumbUrl,
        },
      );

      if (imageSaveError) {
        await supabase.storage
          .from("product-images")
          .remove([fullPath, thumbPath]);

        throw imageSaveError;
      }

      const oldPaths = [
        storagePath(currentSecondaryImage),
        storagePath(currentSecondaryThumbnail),
      ].filter((value): value is string => Boolean(value));

      if (oldPaths.length > 0) {
        await supabase.storage.from("product-images").remove(oldPaths);
      }

      const { error: markError } = await supabase.rpc(
        "mark_product_nutrition_image_generated",
        {
          p_product_id: row.id,
        },
      );

      setCurrentSecondaryImage(fullUrl);
      setCurrentSecondaryThumbnail(thumbUrl);
      setHasImage(true);
      setStatus("review");
      clearPreview();

      setMessage(
        markError
          ? `Imagem 2 salva. Aviso: ${markError.message}`
          : "Imagem 2 salva corretamente. Revise o produto antes de aprovar.",
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a Imagem 2.",
      );
    } finally {
      setImageLoading(false);
    }
  }

  async function save() {
    setSaveLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "set_product_nutrition_metadata",
        {
          p_product_id: row.id,
          p_status: status,
          p_source_name: sourceName || null,
          p_source_url: sourceUrl || null,
          p_notes: notes || null,
        },
      );

      if (error) throw error;

      setMessage(
        status === "approved"
          ? "Informação nutricional aprovada."
          : "Revisão salva.",
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar.",
      );
    } finally {
      setSaveLoading(false);
    }
  }

  const image = row.thumbnail_url ?? row.image_url;
  const canGenerate = Boolean(research?.can_generate_image);

  return (
    <article className="nutrition-workbench-card">
      <div className="nutrition-workbench-product">
        <div className="nutrition-workbench-thumb">
          {image ? (
            <img src={image} alt="" loading="lazy" />
          ) : (
            <ImageOff size={26} />
          )}
        </div>

        <div>
          <span>
            {row.sku ?? "Sem SKU"} · {row.category}
          </span>
          <h2>{row.name}</h2>
          <p>{row.brand ?? "Marca/origem não informada"}</p>
        </div>
      </div>

      <div className="nutrition-workbench-status-line">
        <span className={`nutrition-state ${status}`}>
          {statusLabel(status)}
        </span>

        <span>
          Imagem 2: <strong>{hasImage ? "pronta" : "pendente"}</strong>
        </span>

        {research && (
          <span>
            IA: <strong>{matchLabel(research.product_match_status)}</strong>
          </span>
        )}
      </div>

      <div className="nutrition-ai-primary-actions">
        <button
          className="button gold"
          type="button"
          disabled={researchLoading || status === "not_applicable"}
          onClick={() => void researchWithAi()}
        >
          {researchLoading ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}

          {researchLoading
            ? "Pesquisando fonte oficial..."
            : research
              ? "Pesquisar novamente com IA"
              : "Pesquisar com IA"}
        </button>

        <button
          className="button ghost"
          type="button"
          disabled={imageLoading || !canGenerate}
          onClick={() => void generatePreview()}
          title={
            !canGenerate
              ? "A pesquisa precisa encontrar uma correspondência segura em fonte oficial."
              : undefined
          }
        >
          {imageLoading ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <ImagePlus size={16} />
          )}

          {imageLoading
            ? "Gerando prévia..."
            : previewUrl
              ? "Regenerar prévia"
              : "Pré-visualizar Imagem 2"}
        </button>
      </div>

      {research && <ResearchPreview research={research} />}

      {previewUrl && (
        <div className="nutrition-image-preview-panel">
          <div className="nutrition-image-preview-head">
            <div>
              <span>Prévia da Imagem 2</span>
              <strong>Confira antes de substituir a imagem atual</strong>
            </div>
            <small>
              Gerada localmente no navegador · não foi salva ainda
            </small>
          </div>

          <div className="nutrition-image-preview-frame">
            <img src={previewUrl} alt={`Prévia nutricional de ${row.name}`} />
          </div>

          <div className="nutrition-image-preview-actions">
            <button
              className="button gold"
              type="button"
              disabled={imageLoading}
              onClick={() => void saveGeneratedImage()}
            >
              {imageLoading ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Salvar como Imagem 2
            </button>

            <button
              className="button ghost"
              type="button"
              disabled={imageLoading}
              onClick={clearPreview}
            >
              <Trash2 size={15} />
              Descartar prévia
            </button>
          </div>
        </div>
      )}

      <div className="nutrition-workbench-fields">
        <label>
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as NutritionStatus)
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nome da fonte
          <input
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            placeholder="Ex.: Growth Supplements"
          />
        </label>

        <label className="nutrition-field-wide">
          URL oficial da fonte
          <input
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="Página oficial usada na conferência"
          />
        </label>

        <label className="nutrition-field-wide">
          Observações da revisão
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Ex.: conferi o rótulo físico e a gramatura"
          />
        </label>
      </div>

      <div className="nutrition-workbench-actions">
        <button
          className="button ghost"
          type="button"
          onClick={() => void copyPrompt()}
        >
          <Clipboard size={15} />
          Copiar prompt manual
        </button>

        <Link className="button ghost" href={`/produtos/${row.id}`}>
          <ImagePlus size={15} />
          Abrir produto / Imagem 2
        </Link>

        {sourceUrl && (
          <a
            className="button ghost"
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            Abrir fonte oficial
          </a>
        )}

        <button
          className="button gold"
          type="button"
          disabled={saveLoading}
          onClick={() => void save()}
        >
          <CheckCircle2 size={15} />
          {saveLoading ? "Salvando..." : "Salvar revisão"}
        </button>
      </div>

      {message && (
        <p className="nutrition-workbench-message">{message}</p>
      )}
    </article>
  );
}

export function ProductNutritionWorkbench({
  initialRows,
}: {
  initialRows: NutritionRow[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] =
    useState<NutritionStatus | "all">("all");

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase("pt-BR");

    return initialRows.filter((row) => {
      const matchesQuery =
        !normalized ||
        `${row.name} ${row.brand ?? ""} ${row.sku ?? ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalized);

      const matchesStatus =
        filter === "all" || row.nutrition_status === filter;

      return matchesQuery && matchesStatus;
    });
  }, [initialRows, query, filter]);

  const pending = initialRows.filter((row) =>
    ["pending", "researching", "review"].includes(
      row.nutrition_status,
    ),
  ).length;

  const approved = initialRows.filter(
    (row) => row.nutrition_status === "approved",
  ).length;

  const missingImage = initialRows.filter(
    (row) =>
      !row.secondary_image_url &&
      row.nutrition_status !== "not_applicable",
  ).length;

  const researched = initialRows.filter((row) =>
    Boolean(row.nutrition_ai_researched_at),
  ).length;

  return (
    <section className="nutrition-workbench">
      <div className="nutrition-workbench-kpis nutrition-workbench-kpis-four">
        <article>
          <span>Pendentes</span>
          <strong>{pending}</strong>
        </article>

        <article>
          <span>Pesquisados pela IA</span>
          <strong>{researched}</strong>
        </article>

        <article>
          <span>Sem Imagem 2</span>
          <strong>{missingImage}</strong>
        </article>

        <article>
          <span>Aprovados</span>
          <strong>{approved}</strong>
        </article>
      </div>

      <div className="nutrition-workbench-toolbar">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto, marca ou SKU..."
          />
        </label>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as NutritionStatus | "all")
          }
        >
          <option value="all">Todos os status</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span>{filtered.length} produto(s)</span>
      </div>

      <div className="nutrition-ai-info-banner">
        <Sparkles size={18} />
        <div>
          <strong>Fluxo automático com revisão humana</strong>
          <p>
            A IA pesquisa os dados oficiais. A arte é pré-visualizada no
            seu navegador e só substitui a Imagem 2 depois que você clicar
            em Salvar como Imagem 2.
          </p>
        </div>
      </div>

      <div className="nutrition-workbench-list">
        {filtered.map((row) => (
          <ProductNutritionCard key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}
