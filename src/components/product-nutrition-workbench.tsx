/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  ImageOff,
  Search,
  Sparkles,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NutritionStatus =
  | "pending"
  | "researching"
  | "review"
  | "approved"
  | "not_applicable";

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
};

const STATUS_OPTIONS: Array<{
  value: NutritionStatus;
  label: string;
}> = [
  {
    value: "pending",
    label: "A pesquisar",
  },
  {
    value: "researching",
    label: "Pesquisando",
  },
  {
    value: "review",
    label: "Em revisão",
  },
  {
    value: "approved",
    label: "Aprovado",
  },
  {
    value: "not_applicable",
    label: "Não se aplica",
  },
];

function statusLabel(
  value: NutritionStatus,
) {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value === value,
    )?.label ?? value
  );
}

function buildResearchPrompt(
  row: NutritionRow,
) {
  return [
    "Pesquise a informação nutricional oficial e atual deste produto.",
    "",
    `Produto: ${row.name}`,
    `Marca cadastrada: ${row.brand ?? "não informada"}`,
    `SKU interno Candinho: ${row.sku ?? "sem SKU"}`,
    `Categoria: ${row.category}`,
    row.image_url
      ? `Imagem principal de referência: ${row.image_url}`
      : "Imagem principal: não cadastrada",
    "",
    "REGRAS:",
    "1. Priorize o site oficial da marca/fabricante.",
    "2. Confirme que gramatura, versão, apresentação e sabor correspondem ao produto e à imagem principal.",
    "3. Não invente valores ausentes.",
    "4. Extraia, quando existirem: porção, porções por embalagem, valor energético, carboidratos, açúcares, proteínas, gorduras, fibras, sódio, vitaminas/minerais e outros ativos declarados.",
    "5. Registre ingredientes, alergênicos e modo de uso quando a fonte oficial trouxer essas informações.",
    "6. Informe a URL oficial usada como fonte e a data da consulta.",
    "7. Caso existam versões diferentes do mesmo produto, sinalize a divergência antes de gerar a arte.",
    "",
    "Depois da conferência, prepare o conteúdo para uma arte quadrada 1:1 da Candinho, limpa e legível, destinada à Imagem 2 do produto. A arte deve reproduzir os dados da fonte oficial sem alterar valores nutricionais.",
  ].join("\n");
}

function ProductNutritionCard({
  row,
}: {
  row: NutritionRow;
}) {
  const router = useRouter();

  const [status, setStatus] =
    useState<NutritionStatus>(
      row.nutrition_status,
    );

  const [
    sourceName,
    setSourceName,
  ] = useState(
    row.nutrition_source_name ??
      "",
  );

  const [
    sourceUrl,
    setSourceUrl,
  ] = useState(
    row.nutrition_source_url ??
      "",
  );

  const [notes, setNotes] =
    useState(
      row.nutrition_notes ?? "",
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(
      null,
    );

  async function copyPrompt() {
    await navigator.clipboard.writeText(
      buildResearchPrompt(row),
    );

    setMessage(
      "Prompt de pesquisa copiado.",
    );
  }

  async function save() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase.rpc(
          "set_product_nutrition_metadata",
          {
            p_product_id: row.id,
            p_status: status,
            p_source_name:
              sourceName ||
              null,
            p_source_url:
              sourceUrl || null,
            p_notes:
              notes || null,
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
      setLoading(false);
    }
  }

  const image =
    row.thumbnail_url ??
    row.image_url;

  return (
    <article className="nutrition-workbench-card">
      <div className="nutrition-workbench-product">
        <div className="nutrition-workbench-thumb">
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
            />
          ) : (
            <ImageOff
              size={26}
            />
          )}
        </div>

        <div>
          <span>
            {row.sku ??
              "Sem SKU"}{" "}
            · {row.category}
          </span>

          <h2>
            {row.name}
          </h2>

          <p>
            {row.brand ??
              "Marca não informada"}
          </p>
        </div>
      </div>

      <div className="nutrition-workbench-status-line">
        <span
          className={`nutrition-state ${status}`}
        >
          {statusLabel(
            status,
          )}
        </span>

        <span>
          Imagem 2:{" "}
          <strong>
            {row.secondary_image_url
              ? "pronta"
              : "pendente"}
          </strong>
        </span>
      </div>

      <div className="nutrition-workbench-fields">
        <label>
          Status
          <select
            value={status}
            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value as NutritionStatus,
              )
            }
          >
            {STATUS_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          Nome da fonte
          <input
            value={
              sourceName
            }
            onChange={(
              event,
            ) =>
              setSourceName(
                event.target
                  .value,
              )
            }
            placeholder="Ex.: Growth Supplements"
          />
        </label>

        <label className="nutrition-field-wide">
          URL oficial da fonte
          <input
            value={sourceUrl}
            onChange={(
              event,
            ) =>
              setSourceUrl(
                event.target
                  .value,
              )
            }
            placeholder="Cole a página oficial usada na conferência"
          />
        </label>

        <label className="nutrition-field-wide">
          Observações da revisão
          <textarea
            value={notes}
            onChange={(
              event,
            ) =>
              setNotes(
                event.target
                  .value,
              )
            }
            rows={3}
            placeholder="Ex.: conferir sabor/gramatura antes de aprovar"
          />
        </label>
      </div>

      <div className="nutrition-workbench-actions">
        <button
          className="button ghost"
          type="button"
          onClick={() =>
            void copyPrompt()
          }
        >
          <Clipboard
            size={15}
          />
          Copiar prompt IA
        </button>

        <Link
          className="button ghost"
          href={`/produtos/${row.id}`}
        >
          <Sparkles
            size={15}
          />
          Abrir Imagem 2
        </Link>

        {sourceUrl && (
          <a
            className="button ghost"
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink
              size={15}
            />
            Abrir fonte
          </a>
        )}

        <button
          className="button gold"
          type="button"
          disabled={loading}
          onClick={() =>
            void save()
          }
        >
          <CheckCircle2
            size={15}
          />
          {loading
            ? "Salvando..."
            : "Salvar revisão"}
        </button>
      </div>

      {message && (
        <p className="nutrition-workbench-message">
          {message}
        </p>
      )}
    </article>
  );
}

export function ProductNutritionWorkbench({
  initialRows,
}: {
  initialRows: NutritionRow[];
}) {
  const [query, setQuery] =
    useState("");

  const [filter, setFilter] =
    useState<
      NutritionStatus | "all"
    >("all");

  const filtered =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLocaleLowerCase(
            "pt-BR",
          );

      return initialRows.filter(
        (row) => {
          const matchesQuery =
            !normalized ||
            `${row.name} ${row.brand ?? ""} ${row.sku ?? ""}`
              .toLocaleLowerCase(
                "pt-BR",
              )
              .includes(
                normalized,
              );

          const matchesStatus =
            filter === "all" ||
            row.nutrition_status ===
              filter;

          return (
            matchesQuery &&
            matchesStatus
          );
        },
      );
    }, [
      initialRows,
      query,
      filter,
    ]);

  const pending =
    initialRows.filter(
      (row) =>
        row.nutrition_status ===
          "pending" ||
        row.nutrition_status ===
          "researching" ||
        row.nutrition_status ===
          "review",
    ).length;

  const approved =
    initialRows.filter(
      (row) =>
        row.nutrition_status ===
        "approved",
    ).length;

  const missingImage =
    initialRows.filter(
      (row) =>
        !row.secondary_image_url &&
        row.nutrition_status !==
          "not_applicable",
    ).length;

  return (
    <section className="nutrition-workbench">
      <div className="nutrition-workbench-kpis">
        <article>
          <span>
            Pendentes
          </span>
          <strong>
            {pending}
          </strong>
        </article>

        <article>
          <span>
            Sem Imagem 2
          </span>
          <strong>
            {missingImage}
          </strong>
        </article>

        <article>
          <span>
            Aprovados
          </span>
          <strong>
            {approved}
          </strong>
        </article>
      </div>

      <div className="nutrition-workbench-toolbar">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(
              event,
            ) =>
              setQuery(
                event.target
                  .value,
              )
            }
            placeholder="Buscar produto, marca ou SKU..."
          />
        </label>

        <select
          value={filter}
          onChange={(
            event,
          ) =>
            setFilter(
              event.target
                .value as
                | NutritionStatus
                | "all",
            )
          }
        >
          <option value="all">
            Todos os status
          </option>

          {STATUS_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            ),
          )}
        </select>

        <span>
          {filtered.length} produto(s)
        </span>
      </div>

      <div className="nutrition-workbench-list">
        {filtered.map(
          (row) => (
            <ProductNutritionCard
              key={row.id}
              row={row}
            />
          ),
        )}
      </div>
    </section>
  );
}
