"use client";

import {
  Images,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createDemandGap } from "@/app/(app)/central/rupturas/actions";

type Candidate = {
  title: string;
  image_url: string;
  source_url: string;
};

export function DemandGapForm() {
  const [productName, setProductName] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [candidates, setCandidates] =
    useState<Candidate[]>([]);
  const [selected, setSelected] =
    useState<Candidate | null>(null);

  async function searchImages() {
    const name = productName.trim();

    if (name.length < 3) {
      setMessage(
        "Digite um nome mais completo antes de pesquisar.",
      );
      return;
    }

    setLoading(true);
    setMessage(null);
    setCandidates([]);
    setSelected(null);

    try {
      const supabase = createClient();

      const { data, error } =
        await supabase.functions.invoke(
          "rupture-image-search",
          {
            body: { name },
          },
        );

      if (error) throw error;

      const next = Array.isArray(
        data?.candidates,
      )
        ? (data.candidates as Candidate[])
        : [];

      setCandidates(next);

      if (next.length === 0) {
        setMessage(
          String(
            data?.message ??
              "Nenhuma imagem encontrada. Tente incluir marca e tamanho.",
          ),
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao pesquisar imagens.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      action={createDemandGap}
      className="demand-gap-form"
    >
      <input
        type="hidden"
        name="image_url"
        value={selected?.image_url ?? ""}
      />

      <input
        type="hidden"
        name="image_source_url"
        value={selected?.source_url ?? ""}
      />

      <div className="demand-gap-form-main">
        <label className="field demand-gap-name-field">
          <span>Produto procurado</span>

          <div className="demand-gap-name-row">
            <input
              className="input"
              name="product_name"
              value={productName}
              onChange={(event) =>
                setProductName(
                  event.target.value,
                )
              }
              placeholder="Ex.: Whey Isolado Dux 900g"
              required
            />

            <button
              className="button ghost"
              type="button"
              onClick={searchImages}
              disabled={loading}
            >
              {loading ? (
                <LoaderCircle
                  className="spin"
                  size={16}
                />
              ) : (
                <Images size={16} />
              )}
              Nexus: buscar 3 fotos
            </button>
          </div>
        </label>

        {message && (
          <p className="demand-gap-search-message">
            {message}
          </p>
        )}

        {candidates.length > 0 && (
          <div className="demand-gap-image-candidates">
            {candidates.map(
              (candidate) => (
                <button
                  type="button"
                  key={candidate.image_url}
                  className={
                    selected?.image_url ===
                    candidate.image_url
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setSelected(candidate)
                  }
                >
                  <img
                    src={candidate.image_url}
                    alt={candidate.title}
                    referrerPolicy="no-referrer"
                  />

                  <span>
                    {selected?.image_url ===
                    candidate.image_url
                      ? "Selecionada"
                      : "Usar esta foto"}
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        <div className="demand-gap-form-grid">
          <label className="field">
            <span>Operação</span>
            <select
              className="select"
              name="operation_scope"
              defaultValue="supplements"
            >
              <option value="supplements">
                Suplementos
              </option>
              <option value="fitness">
                Fitness
              </option>
              <option value="both">
                Ambas
              </option>
            </select>
          </label>

          <label className="field">
            <span>Prioridade</span>
            <select
              className="select"
              name="priority"
              defaultValue="medium"
            >
              <option value="low">
                Baixa
              </option>
              <option value="medium">
                Média
              </option>
              <option value="high">
                Alta
              </option>
              <option value="extreme">
                Extrema
              </option>
            </select>
          </label>

          <label className="field">
            <span>Marca</span>
            <input
              className="input"
              name="brand"
              placeholder="Opcional"
            />
          </label>

          <label className="field">
            <span>Categoria</span>
            <input
              className="input"
              name="category"
              placeholder="Opcional"
            />
          </label>

          <label className="field">
            <span>Cliente</span>
            <input
              className="input"
              name="customer_name"
              placeholder="Quem pediu?"
            />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input
              className="input"
              name="customer_phone"
              placeholder="Opcional"
            />
          </label>

          <label className="field">
            <span>Cidade</span>
            <input
              className="input"
              name="city"
              placeholder="Ex.: Caparaó"
            />
          </label>

          <label className="field">
            <span>Data da procura</span>
            <input
              className="input"
              type="date"
              name="requested_on"
            />
          </label>
        </div>

        <label className="field">
          <span>Observações</span>
          <textarea
            className="input demand-gap-textarea"
            name="notes"
            placeholder="Preço que o cliente esperava, tamanho, sabor, contexto..."
          />
        </label>

        <button
          className="button gold"
          type="submit"
        >
          <Sparkles size={16} />
          Registrar demanda
        </button>
      </div>
    </form>
  );
}
