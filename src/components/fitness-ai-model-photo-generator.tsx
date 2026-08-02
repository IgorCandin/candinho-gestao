"use client";

import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./fitness-ai-model-photo-generator.module.css";

type Source = {
  url: string;
  color: string | null;
  label: string;
};

type Media = {
  id: string;
  color: string | null;
  media_type: string;
  source_image_url: string | null;
  image_url: string;
  public_visible: boolean;
  created_at: string;
};

export function FitnessAiModelPhotoGenerator({
  productId,
  productName,
  sources,
}: {
  productId: string;
  productName: string;
  sources: Source[];
}) {
  const cleanSources = useMemo(() => {
    const seen = new Set<string>();

    return sources.filter((source) => {
      if (!source.url || seen.has(source.url)) {
        return false;
      }

      seen.add(source.url);
      return true;
    });
  }, [sources]);

  const [sourceUrl, setSourceUrl] = useState(
    cleanSources[0]?.url ?? "",
  );
  const [scene, setScene] = useState(
    "Academia lifestyle clean com luz natural",
  );
  const [profile, setProfile] = useState(
    "aleatorio",
  );
  const [context, setContext] = useState("");
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSource = cleanSources.find(
    (source) => source.url === sourceUrl,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/fitness/produtos/${productId}/modelo`,
          { cache: "no-store" },
        );

        const payload = (await response.json()) as {
          items?: Media[];
        };

        if (!cancelled && response.ok) {
          setItems(
            Array.isArray(payload.items)
              ? payload.items
              : [],
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function generate() {
    if (!sourceUrl || loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/fitness/produtos/${productId}/modelo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_image_url: sourceUrl,
            color: selectedSource?.color ?? null,
            scene,
            model_profile: profile,
            additional_context: context,
          }),
        },
      );

      const payload = (await response.json()) as {
        item?: Media;
        error?: string;
      };

      if (!response.ok || !payload.item) {
        throw new Error(
          payload.error ||
            "Não foi possível gerar a foto.",
        );
      }

      setItems((current) => [
        payload.item!,
        ...current,
      ]);
      setMessage(
        "Foto gerada. Ela fica somente na operação interna até você publicar.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar a foto.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function togglePublic(item: Media) {
    const response = await fetch(
      `/api/fitness/produtos/${productId}/modelo`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: item.id,
          public_visible: !item.public_visible,
        }),
      },
    );

    const payload = (await response.json()) as {
      item?: Media;
      error?: string;
    };

    if (!response.ok || !payload.item) {
      setMessage(
        payload.error || "Não foi possível atualizar a galeria.",
      );
      return;
    }

    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? payload.item! : row,
      ),
    );
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <span>
            <Sparkles size={14} />
            Nexus · foto com modelo
          </span>
          <strong>
            Vista {productName} em um(a) modelo realista
          </strong>
          <p>
            A foto original da peça é usada como referência.
            A imagem gerada nunca é publicada automaticamente.
          </p>
        </div>
      </div>

      {cleanSources.length === 0 ? (
        <div className={styles.empty}>
          <ImagePlus size={22} />
          Envie uma foto real da peça primeiro.
        </div>
      ) : (
        <>
          <div className={styles.formGrid}>
            <label>
              <span>Foto de referência</span>
              <select
                value={sourceUrl}
                onChange={(event) =>
                  setSourceUrl(event.target.value)
                }
              >
                {cleanSources.map((source) => (
                  <option
                    value={source.url}
                    key={source.url}
                  >
                    {source.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Modelo</span>
              <select
                value={profile}
                onChange={(event) =>
                  setProfile(event.target.value)
                }
              >
                <option value="aleatorio">
                  Aleatório
                </option>
                <option value="uma mulher adulta com aparência brasileira e proporções naturais">
                  Feminino
                </option>
                <option value="um homem adulto com aparência brasileira e proporções naturais">
                  Masculino
                </option>
              </select>
            </label>

            <label>
              <span>Cenário</span>
              <select
                value={scene}
                onChange={(event) =>
                  setScene(event.target.value)
                }
              >
                <option>
                  Academia lifestyle clean com luz natural
                </option>
                <option>
                  Estúdio de e-commerce com fundo neutro
                </option>
                <option>
                  Rua urbana discreta em luz de fim de tarde
                </option>
                <option>
                  Ambiente casual fitness em casa
                </option>
              </select>
            </label>

            <label className={styles.context}>
              <span>Observação opcional</span>
              <input
                value={context}
                onChange={(event) =>
                  setContext(event.target.value)
                }
                placeholder="Ex.: pose lateral, foto de corpo inteiro..."
              />
            </label>
          </div>

          <div className={styles.filters}>
            <span>
              <CheckCircle2 size={13} />
              fidelidade alta à peça
            </span>
            <span>
              <CheckCircle2 size={13} />
              pele e tecido naturais
            </span>
            <span>
              <CheckCircle2 size={13} />
              anatomia realista
            </span>
            <span>
              <CheckCircle2 size={13} />
              sem texto ou marca d’água
            </span>
          </div>

          <button
            className="button gold"
            type="button"
            disabled={loading}
            onClick={() => void generate()}
          >
            {loading ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : (
              <Sparkles size={16} />
            )}
            {loading
              ? "Gerando foto..."
              : "Gerar foto com modelo"}
          </button>
        </>
      )}

      {message && (
        <p className={styles.message}>{message}</p>
      )}

      {!loadingList && items.length > 0 && (
        <div className={styles.generated}>
          <div className={styles.generatedHead}>
            <strong>Fotos geradas</strong>
            <small>
              Internas por padrão · publique somente as que ficaram naturais.
            </small>
          </div>

          <div className={styles.grid}>
            {items.map((item) => (
              <article key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={`Foto gerada ${item.color || productName}`}
                />
                <div>
                  <strong>
                    {item.color || "Lifestyle"}
                  </strong>
                  <button
                    className={`button compact-button ${
                      item.public_visible
                        ? "ghost"
                        : "gold"
                    }`}
                    type="button"
                    onClick={() =>
                      void togglePublic(item)
                    }
                  >
                    {item.public_visible
                      ? "Remover da vitrine"
                      : "Publicar na vitrine"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
