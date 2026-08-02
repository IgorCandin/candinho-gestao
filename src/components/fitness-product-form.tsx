"use client";

import {
  CopyPlus,
  ImageIcon,
  ImagePlus,
  LoaderCircle,
  Palette,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  FitnessProductRow,
  FitnessStockRow,
  FitnessSupplierRow,
} from "@/lib/types";
import styles from "./fitness-product-form.module.css";

type VariantDraft = {
  id: string | null;
  key: string;
  size: string;
  color: string;
  sku: string;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
  reorderTarget: string;
  imageUrl: string;
  active: boolean;
};

const FALLBACK_CATEGORIES = [
  "Calça", "Camiseta", "Conjunto", "Faixa", "Jaqueta",
  "Legging", "Macacão", "Meia", "Short", "Top",
];

const FALLBACK_SIZES = [
  "PP", "P", "M", "G", "GG", "G1", "G2", "G3", "Único",
];

const FALLBACK_COLORS = [
  "Preto", "Branco", "Azul", "Rosa", "Vermelho",
  "Verde", "Cinza", "Marrom", "Bege", "Roxo",
];

const IMAGE_BUCKET = "fitness-product-images";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function makeKey() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function textKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function newVariant(source?: VariantDraft): VariantDraft {
  return {
    id: null,
    key: makeKey(),
    size: source?.size ?? "M",
    color: source?.color ?? "Preto",
    sku: "",
    costPrice: source?.costPrice ?? "0",
    salePrice: source?.salePrice ?? "0",
    minimumStock: source?.minimumStock ?? "0",
    reorderTarget: source?.reorderTarget ?? "0",
    imageUrl: source?.imageUrl ?? "",
    active: true,
  };
}

export function FitnessProductForm({
  product,
  variants,
  suppliers,
}: {
  product?: FitnessProductRow;
  variants?: FitnessStockRow[];
  suppliers: FitnessSupplierRow[];
}) {
  const router = useRouter();

  const inferredSupplier =
    variants?.find((variant) => variant.default_supplier_id)
      ?.default_supplier_id ?? "";

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [defaultSupplierId, setDefaultSupplierId] = useState(inferredSupplier);

  const [rows, setRows] = useState<VariantDraft[]>(
    variants?.length
      ? variants.map((variant) => ({
          id: variant.variant_id,
          key: variant.variant_id,
          size: variant.size,
          color: variant.color,
          sku: variant.sku ?? "",
          costPrice: String(variant.cost_price),
          salePrice: String(variant.sale_price),
          minimumStock: String(variant.minimum_stock),
          reorderTarget: String(variant.reorder_target),
          imageUrl:
            variant.image_url && variant.image_url !== product?.image_url
              ? variant.image_url
              : "",
          active: variant.variant_active,
        }))
      : [newVariant()],
  );

  const [categoryOptions, setCategoryOptions] = useState(
    uniqueSorted([...FALLBACK_CATEGORIES, product?.category ?? ""]),
  );
  const [sizeOptions, setSizeOptions] = useState(
    uniqueSorted([
      ...FALLBACK_SIZES,
      ...(variants ?? []).map((variant) => variant.size),
    ]),
  );
  const [colorOptions, setColorOptions] = useState(
    uniqueSorted([
      ...FALLBACK_COLORS,
      ...(variants ?? []).map((variant) => variant.color),
    ]),
  );

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExistingOptions() {
      const supabase = createClient();

      const [productResult, variantResult] = await Promise.all([
        supabase.from("fitness_products").select("category").order("category"),
        supabase.from("fitness_variants").select("size,color").order("size").order("color"),
      ]);

      if (cancelled) return;

      if (!productResult.error) {
        setCategoryOptions((current) =>
          uniqueSorted([
            ...current,
            ...(productResult.data ?? []).map((row) => String(row.category ?? "")),
          ]),
        );
      }

      if (!variantResult.error) {
        setSizeOptions((current) =>
          uniqueSorted([
            ...current,
            ...(variantResult.data ?? []).map((row) => String(row.size ?? "")),
          ]),
        );

        setColorOptions((current) =>
          uniqueSorted([
            ...current,
            ...(variantResult.data ?? []).map((row) => String(row.color ?? "")),
          ]),
        );
      }
    }

    void loadExistingOptions();
    return () => { cancelled = true; };
  }, []);

  const colorGroups = useMemo(() => {
    const byColor = new Map<string, {
      color: string;
      imageUrl: string;
      variants: number;
    }>();

    for (const row of rows) {
      const color = row.color.trim();
      if (!color) continue;

      const key = textKey(color);
      const current = byColor.get(key);

      if (!current) {
        byColor.set(key, {
          color,
          imageUrl: row.imageUrl.trim(),
          variants: 1,
        });
      } else {
        current.variants += 1;
        if (!current.imageUrl && row.imageUrl.trim()) {
          current.imageUrl = row.imageUrl.trim();
        }
      }
    }

    return [...byColor.values()].sort((a, b) =>
      a.color.localeCompare(b.color, "pt-BR"),
    );
  }, [rows]);

  function update(key: string, change: Partial<VariantDraft>) {
    setRows((current) =>
      current.map((row) => row.key === key ? { ...row, ...change } : row),
    );
  }

  function addVariant(source?: VariantDraft) {
    setRows((current) => [
      ...current,
      newVariant(source ?? current.at(-1)),
    ]);
  }

  function setColorImage(color: string, nextUrl: string) {
    const key = textKey(color);
    setRows((current) =>
      current.map((row) =>
        textKey(row.color) === key ? { ...row, imageUrl: nextUrl } : row,
      ),
    );
  }

  async function uploadImage(
    file: File,
    uploadKey: string,
    onUploaded: (url: string) => void,
  ) {
    setMessage(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Use uma foto JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setMessage("A foto precisa ter no máximo 10 MB.");
      return;
    }

    setUploadingPhoto(uploadKey);

    try {
      const supabase = createClient();
      const extension = extensionFor(file);
      const objectPath = `fitness/${product?.id ?? "novos"}/${Date.now()}-${makeKey()}.${extension}`;

      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(objectPath);

      if (!data.publicUrl) {
        throw new Error("Não foi possível obter o link da foto.");
      }

      onUploaded(data.publicUrl);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setUploadingPhoto(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!name.trim()) throw new Error("Informe o nome da peça.");
      if (!category.trim()) {
        throw new Error("Selecione ou digite a categoria.");
      }

      if (
        rows.some(
          (row) =>
            !row.size.trim()
            || !row.color.trim()
            || Number(row.costPrice) < 0
            || Number(row.salePrice) < 0
            || Number(row.minimumStock) < 0
            || Number(row.reorderTarget) < 0,
        )
      ) {
        throw new Error("Revise as variações.");
      }

      const firstColorPhoto =
        rows.find((row) => row.imageUrl.trim())?.imageUrl.trim() ?? "";

      const coverImage = imageUrl.trim() || firstColorPhoto || null;

      const { data, error } = await createClient().rpc(
        "save_fitness_product_v2",
        {
          p_product_id: product?.id ?? null,
          p_name: name.trim(),
          p_category: category.trim(),
          p_description: description.trim() || null,
          p_image_url: coverImage,
          p_active: active,
          p_default_supplier_id: defaultSupplierId || null,
          p_variants: rows.map((row) => ({
            id: row.id,
            size: row.size.trim(),
            color: row.color.trim(),
            sku: row.sku.trim() || null,
            cost_price: Number(row.costPrice),
            sale_price: Number(row.salePrice),
            minimum_stock: Number(row.minimumStock),
            reorder_target: Number(row.reorderTarget),
            image_url: row.imageUrl.trim() || null,
            active: row.active,
          })),
        },
      );

      if (error) throw error;

      router.push(`/fitness/produtos/${String(data)}`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a peça.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="product-editor-layout" onSubmit={submit}>
      <div className="product-editor-main">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Produto</h2>
              <p>
                Cadastro principal. O fornecedor escolhido aqui vale para
                todas as variações.
              </p>
            </div>
          </div>

          <div className="panel-body form-grid-two">
            <label className="field field-span-two">
              <span>Nome</span>
              <input
                className="input"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Legging Run"
              />
            </label>

            <label className="field">
              <span>Categoria</span>
              <input
                className="input"
                list="fitness-category-options"
                required
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Selecione ou digite"
              />
              <datalist id="fitness-category-options">
                {categoryOptions.map((option) => (
                  <option value={option} key={option} />
                ))}
              </datalist>
              <small className={styles.fieldHint}>
                Escolha uma existente ou digite uma nova categoria.
              </small>
            </label>

            <label className="field">
              <span>Fornecedor</span>
              <select
                className="select"
                value={defaultSupplierId}
                onChange={(event) => setDefaultSupplierId(event.target.value)}
              >
                <option value="">Sem fornecedor</option>
                {suppliers
                  .filter((supplier) => supplier.active)
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
              </select>
              <small className={styles.fieldHint}>
                Um único fornecedor para o produto e suas variações.
              </small>
            </label>

            <label className="field field-span-two">
              <span>Descrição</span>
              <textarea
                className="textarea"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descrição curta da peça."
              />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Fotos</h2>
              <p>
                Envie a capa e, se houver mais de uma cor, uma foto específica
                para cada cor.
              </p>
            </div>
          </div>

          <div className={`panel-body ${styles.photoSection}`}>
            <div className={styles.coverPhoto}>
              <div className={styles.photoPreview}>
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={`Foto principal de ${name || "produto"}`}
                  />
                ) : (
                  <div className={styles.photoPlaceholder}>
                    <ImageIcon size={28} />
                    <span>Sem capa definida</span>
                  </div>
                )}
              </div>

              <div className={styles.photoCopy}>
                <span className={styles.photoEyebrow}>
                  <Star size={13} />
                  Foto principal
                </span>
                <strong>Capa do produto</strong>
                <small>
                  Se não escolher uma capa, a primeira foto de cor será usada
                  automaticamente.
                </small>

                <div className={styles.photoActions}>
                  <label className="button ghost compact-button">
                    {uploadingPhoto === "cover"
                      ? <LoaderCircle className="spin" size={15} />
                      : <Upload size={15} />}
                    {imageUrl ? "Trocar foto" : "Enviar foto"}
                    <input
                      hidden
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingPhoto !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadImage(file, "cover", setImageUrl);
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>

                  {imageUrl && (
                    <button
                      className="button ghost compact-button"
                      type="button"
                      onClick={() => setImageUrl("")}
                    >
                      <X size={14} />
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.colorPhotoHeader}>
              <div>
                <span className={styles.photoEyebrow}>
                  <Palette size={13} />
                  Fotos por cor
                </span>
                <strong>{colorGroups.length} cor(es) cadastrada(s)</strong>
              </div>
              <small>
                A mesma foto é aplicada automaticamente a todos os tamanhos
                daquela cor.
              </small>
            </div>

            <div className={styles.colorPhotoGrid}>
              {colorGroups.map((group) => {
                const effectiveImage = group.imageUrl || imageUrl;
                const uploadKey = `color:${textKey(group.color)}`;

                return (
                  <div
                    className={styles.colorPhotoCard}
                    key={textKey(group.color)}
                  >
                    <div className={styles.colorPhotoPreview}>
                      {effectiveImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={effectiveImage}
                          alt={`${name || "Produto"} ${group.color}`}
                        />
                      ) : (
                        <ImagePlus size={24} />
                      )}

                      {!group.imageUrl && imageUrl && (
                        <span className={styles.fallbackBadge}>
                          usando capa
                        </span>
                      )}
                    </div>

                    <div className={styles.colorPhotoCopy}>
                      <strong>{group.color}</strong>
                      <small>{group.variants} variação(ões)</small>
                    </div>

                    <div className={styles.colorPhotoActions}>
                      <label className="button ghost compact-button">
                        {uploadingPhoto === uploadKey
                          ? <LoaderCircle className="spin" size={14} />
                          : <Upload size={14} />}
                        {group.imageUrl ? "Trocar" : "Foto da cor"}
                        <input
                          hidden
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingPhoto !== null}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadImage(
                                file,
                                uploadKey,
                                (url) => setColorImage(group.color, url),
                              );
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>

                      {group.imageUrl && (
                        <>
                          <button
                            className="icon-button"
                            type="button"
                            title="Usar como foto principal"
                            onClick={() => setImageUrl(group.imageUrl)}
                          >
                            <Star size={14} />
                          </button>

                          <button
                            className="icon-button"
                            type="button"
                            title="Remover foto específica da cor"
                            onClick={() => setColorImage(group.color, "")}
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <small className={styles.uploadHelp}>
              JPG, PNG ou WEBP · até 10 MB por foto. Não precisa mais copiar
              URL manualmente.
            </small>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Variações</h2>
              <p>
                Tamanho, cor, preço e estoque mínimo. O fornecedor é o mesmo
                definido no produto.
              </p>
            </div>

            <button
              type="button"
              className="button ghost"
              onClick={() => addVariant()}
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          <div className="panel-body sale-form-items">
            {rows.map((row, index) => (
              <div
                className={`sale-form-item ${styles.variantCard}`}
                key={row.key}
              >
                <div className="sale-form-item-head">
                  <div className={styles.variantTitle}>
                    <strong>Variação {index + 1}</strong>
                    {row.imageUrl && (
                      <span className={styles.variantPhotoBadge}>
                        <ImageIcon size={12} />
                        foto da cor
                      </span>
                    )}
                  </div>

                  <div className={styles.variantActions}>
                    <button
                      type="button"
                      className="icon-button"
                      title="Duplicar variação"
                      onClick={() => addVariant(row)}
                    >
                      <CopyPlus size={16} />
                    </button>

                    {rows.length > 1 && !row.id && (
                      <button
                        type="button"
                        className="icon-button"
                        title="Remover variação"
                        onClick={() =>
                          setRows((current) =>
                            current.filter((item) => item.key !== row.key),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-grid-three">
                  <label className="field">
                    <span>Tamanho</span>
                    <input
                      className="input"
                      list="fitness-size-options"
                      value={row.size}
                      onChange={(event) =>
                        update(row.key, { size: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Cor</span>
                    <input
                      className="input"
                      list="fitness-color-options"
                      value={row.color}
                      onChange={(event) =>
                        update(row.key, { color: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>SKU</span>
                    <input
                      className="input"
                      value={row.sku}
                      onChange={(event) =>
                        update(row.key, { sku: event.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </label>

                  <label className="field">
                    <span>Custo</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.costPrice}
                      onChange={(event) =>
                        update(row.key, { costPrice: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Venda</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.salePrice}
                      onChange={(event) =>
                        update(row.key, { salePrice: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Estoque mínimo</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={row.minimumStock}
                      onChange={(event) =>
                        update(row.key, { minimumStock: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Estoque ideal</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={row.reorderTarget}
                      onChange={(event) =>
                        update(row.key, { reorderTarget: event.target.value })
                      }
                    />
                  </label>

                  <label className="switch-row">
                    <div><strong>Ativa</strong></div>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(event) =>
                        update(row.key, { active: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <datalist id="fitness-size-options">
            {sizeOptions.map((option) => (
              <option value={option} key={option} />
            ))}
          </datalist>

          <datalist id="fitness-color-options">
            {colorOptions.map((option) => (
              <option value={option} key={option} />
            ))}
          </datalist>
        </article>
      </div>

      <aside className="product-editor-side">
        <article className="panel">
          <div className="panel-body product-switch-list">
            <label className="switch-row">
              <div>
                <strong>Produto ativo</strong>
                <span>Disponível para pedidos e vendas.</span>
              </div>
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-body">
            {message && (
              <p className="form-error visible">{message}</p>
            )}

            <button
              className="button gold product-save-button"
              disabled={loading || uploadingPhoto !== null}
            >
              {loading
                ? <LoaderCircle className="spin" size={17} />
                : <Save size={17} />}
              Salvar produto
            </button>
          </div>
        </article>
      </aside>
    </form>
  );
}
