"use client";

import {
  Boxes,
  LoaderCircle,
  Scissors,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import type { FitnessSetConfig } from "@/lib/fitness-set-data";
import styles from "./fitness-set-manager.module.css";

type Variant = {
  variant_id: string;
  size: string;
  color: string;
  available_quantity: number;
  sale_price: number;
};

function money(value: number) {
  return Number.isFinite(value)
    ? value.toFixed(2)
    : "0.00";
}

export function FitnessSetManager({
  productId,
  productName,
  category,
  variants,
  config,
}: {
  productId: string;
  productName: string;
  category: string;
  variants: Variant[];
  config: FitnessSetConfig;
}) {
  const router = useRouter();

  const looksLikeSet =
    category.toLocaleLowerCase("pt-BR").includes("conjunto") ||
    config.enabled;

  const suggestedTotal = useMemo(() => {
    const values = variants
      .map((variant) => variant.sale_price)
      .filter((value) => value > 0);

    if (values.length === 0) return 0;
    return Math.max(...values);
  }, [variants]);

  const [topLabel, setTopLabel] = useState("Top");
  const [bottomLabel, setBottomLabel] = useState("Calça");
  const [topPrice, setTopPrice] = useState(
    money(suggestedTotal / 2),
  );
  const [bottomPrice, setBottomPrice] = useState(
    money(suggestedTotal / 2),
  );

  const availableVariants = useMemo(
    () =>
      variants
        .filter(
          (variant) =>
            variant.available_quantity > 0,
        )
        .sort((a, b) =>
          `${a.color}${a.size}`.localeCompare(
            `${b.color}${b.size}`,
            "pt-BR",
          ),
        ),
    [variants],
  );

  const [variantId, setVariantId] = useState(
    availableVariants[0]?.variant_id ?? "",
  );
  const [quantity, setQuantity] = useState("1");
  const [loadingConfig, setLoadingConfig] =
    useState(false);
  const [loadingSplit, setLoadingSplit] =
    useState(false);
  const [message, setMessage] = useState<string | null>(
    null,
  );

  if (!looksLikeSet) return null;

  async function configure() {
    if (loadingConfig) return;

    setLoadingConfig(true);
    setMessage(null);

    try {
      const top = Number(topPrice.replace(",", "."));
      const bottom = Number(
        bottomPrice.replace(",", "."),
      );

      if (
        !topLabel.trim() ||
        !bottomLabel.trim() ||
        top < 0 ||
        bottom < 0
      ) {
        throw new Error(
          "Revise os nomes e preços das duas partes.",
        );
      }

      const { error } = await createClient().rpc(
        "configure_fitness_split_set_v1",
        {
          p_set_product_id: productId,
          p_top_label: topLabel.trim(),
          p_top_sale_price: top,
          p_bottom_label: bottomLabel.trim(),
          p_bottom_sale_price: bottom,
        },
      );

      if (error) throw error;

      setMessage(
        "Conjunto preparado. Agora ele pode ser separado fisicamente quando necessário.",
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível configurar o conjunto.",
      );
    } finally {
      setLoadingConfig(false);
    }
  }

  async function split() {
    if (!variantId || loadingSplit) return;

    setLoadingSplit(true);
    setMessage(null);

    try {
      const count = Number(quantity);

      if (!Number.isInteger(count) || count <= 0) {
        throw new Error(
          "Informe uma quantidade válida.",
        );
      }

      const selected = variants.find(
        (variant) =>
          variant.variant_id === variantId,
      );

      if (
        selected &&
        count > selected.available_quantity
      ) {
        throw new Error(
          `Disponível para separar: ${selected.available_quantity}.`,
        );
      }

      const { error } = await createClient().rpc(
        "split_fitness_set_variant_v1",
        {
          p_set_variant_id: variantId,
          p_quantity: count,
        },
      );

      if (error) throw error;

      setMessage(
        `${count} conjunto(s) separado(s): as partes agora aparecem como produtos normais no estoque e podem ser vendidas individualmente.`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível separar o conjunto.",
      );
    } finally {
      setLoadingSplit(false);
    }
  }

  return (
    <article className={`panel ${styles.panel}`}>
      <div className="panel-head">
        <div>
          <span className={styles.eyebrow}>
            <Scissors size={14} />
            Conjunto divisível
          </span>
          <h2>Vender junto ou separado</h2>
          <p>
            O conjunto continua como uma peça enquanto
            estiver inteiro. Só ao separar no estoque ele
            vira duas partes vendáveis.
          </p>
        </div>
        <Boxes size={21} />
      </div>

      {!config.enabled ? (
        <div className={`panel-body ${styles.setup}`}>
          <div className={styles.explain}>
            <strong>
              Preparar {productName} para venda avulsa
            </strong>
            <p>
              Exemplo: Top + Calça. O sistema cria as duas
              partes sem mexer no estoque agora.
            </p>
          </div>

          <div className={styles.grid}>
            <label className="field">
              <span>Parte de cima</span>
              <input
                className="input"
                value={topLabel}
                onChange={(event) =>
                  setTopLabel(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Preço avulso</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={topPrice}
                onChange={(event) =>
                  setTopPrice(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Parte de baixo</span>
              <input
                className="input"
                value={bottomLabel}
                onChange={(event) =>
                  setBottomLabel(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Preço avulso</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={bottomPrice}
                onChange={(event) =>
                  setBottomPrice(event.target.value)
                }
              />
            </label>
          </div>

          <div className={styles.setupFooter}>
            <span>
              <Sparkles size={13} />
              O custo será dividido proporcionalmente aos
              preços avulsos para manter margem e estoque
              coerentes.
            </span>

            <button
              className="button gold"
              type="button"
              disabled={loadingConfig}
              onClick={() => void configure()}
            >
              {loadingConfig ? (
                <LoaderCircle
                  className="spin"
                  size={16}
                />
              ) : (
                <Scissors size={16} />
              )}
              Preparar venda separada
            </button>
          </div>
        </div>
      ) : (
        <div className={`panel-body ${styles.ready}`}>
          <div className={styles.parts}>
            {config.components.map((component) => (
              <div
                className={styles.part}
                key={component.id}
              >
                <span>
                  {component.component_role === "top"
                    ? "Parte de cima"
                    : component.component_role ===
                        "bottom"
                      ? "Parte de baixo"
                      : "Parte"}
                </span>
                <strong>
                  {component.component_label}
                </strong>
                <small>
                  {formatCurrency(
                    component.sale_price,
                  )}{" "}
                  avulso
                </small>
              </div>
            ))}
          </div>

          <div className={styles.splitBox}>
            <div>
              <strong>Separar conjunto do estoque</strong>
              <p>
                Use somente quando a Giulia abrir
                fisicamente um conjunto para vender as
                partes separadas.
              </p>
            </div>

            <div className={styles.splitFields}>
              <label className="field">
                <span>Cor / tamanho</span>
                <select
                  className="select"
                  value={variantId}
                  onChange={(event) =>
                    setVariantId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Selecione
                  </option>
                  {availableVariants.map(
                    (variant) => (
                      <option
                        value={
                          variant.variant_id
                        }
                        key={
                          variant.variant_id
                        }
                      >
                        {variant.color} ·{" "}
                        {variant.size} · disp.{" "}
                        {
                          variant.available_quantity
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="field">
                <span>Qtd.</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                />
              </label>

              <button
                className="button gold"
                type="button"
                disabled={
                  loadingSplit || !variantId
                }
                onClick={() => void split()}
              >
                {loadingSplit ? (
                  <LoaderCircle
                    className="spin"
                    size={16}
                  />
                ) : (
                  <Scissors size={16} />
                )}
                Separar
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={styles.message}>{message}</div>
      )}
    </article>
  );
}
