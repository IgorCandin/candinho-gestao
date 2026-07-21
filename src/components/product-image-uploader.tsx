/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import {
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SlotName =
  | "primary"
  | "secondary";

type ImageState = {
  imageUrl: string | null;
  thumbnailUrl: string | null;
};

const MAX_ORIGINAL =
  10 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function loadImage(
  file: File,
) {
  const url =
    URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>(
      (
        resolve,
        reject,
      ) => {
        const image =
          new Image();

        image.onload = () =>
          resolve(image);

        image.onerror =
          () =>
            reject(
              new Error(
                "Não foi possível ler a imagem.",
              ),
            );

        image.src = url;
      },
    );
  } finally {
    URL.revokeObjectURL(
      url,
    );
  }
}

async function createVariant(
  image: HTMLImageElement,
  maxDimension: number,
  targetBytes: number,
  startQuality: number,
) {
  const scale = Math.min(
    1,
    maxDimension /
      Math.max(
        image.naturalWidth,
        image.naturalHeight,
      ),
  );

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width = Math.max(
    1,
    Math.round(
      image.naturalWidth *
        scale,
    ),
  );

  canvas.height = Math.max(
    1,
    Math.round(
      image.naturalHeight *
        scale,
    ),
  );

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Não foi possível otimizar a imagem.",
    );
  }

  context.imageSmoothingEnabled =
    true;

  context.imageSmoothingQuality =
    "high";

  context.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  let quality =
    startQuality;

  let blob:
    | Blob
    | null = null;

  do {
    blob =
      await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/webp",
            quality,
          ),
      );

    quality -= 0.07;
  } while (
    blob &&
    blob.size >
      targetBytes &&
    quality >= 0.48
  );

  if (!blob) {
    throw new Error(
      "Não foi possível converter a imagem.",
    );
  }

  return blob;
}

async function optimize(
  file: File,
) {
  const image =
    await loadImage(file);

  const [
    full,
    thumbnail,
  ] = await Promise.all([
    createVariant(
      image,
      1200,
      450 * 1024,
      0.82,
    ),
    createVariant(
      image,
      320,
      80 * 1024,
      0.78,
    ),
  ]);

  return {
    full,
    thumbnail,
  };
}

function storagePath(
  url: string | null,
) {
  if (!url) return null;

  const marker =
    "/storage/v1/object/public/product-images/";

  const index =
    url.indexOf(marker);

  return index >= 0
    ? decodeURIComponent(
        url.slice(
          index +
            marker.length,
        ),
      )
    : null;
}

function Slot({
  productId,
  slot,
  label,
  initial,
  helper,
}: {
  productId: string;
  slot: SlotName;
  label: string;
  initial: ImageState;
  helper?: string;
}) {
  const router =
    useRouter();

  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const [
    current,
    setCurrent,
  ] = useState(initial);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  async function saveImage(
    imageUrl:
      | string
      | null,
    thumbnailUrl:
      | string
      | null,
  ) {
    const supabase =
      createClient();

    const { error } =
      await supabase.rpc(
        "set_product_image",
        {
          p_product_id:
            productId,
          p_slot: slot,
          p_image_url:
            imageUrl,
          p_thumbnail_url:
            thumbnailUrl,
        },
      );

    if (error) throw error;
  }

  async function upload(
    file?: File,
  ) {
    if (!file) return;

    setMessage(null);

    if (
      !ALLOWED.has(
        file.type,
      )
    ) {
      setMessage(
        "Use JPG, PNG ou WEBP.",
      );

      return;
    }

    if (
      file.size >
      MAX_ORIGINAL
    ) {
      setMessage(
        "A imagem original precisa ter no máximo 10 MB.",
      );

      return;
    }

    setLoading(true);

    const supabase =
      createClient();

    const token =
      crypto.randomUUID();

    const fullPath =
      `${productId}/${slot}-${token}.webp`;

    const thumbPath =
      `${productId}/${slot}-${token}-thumb.webp`;

    try {
      const optimized =
        await optimize(file);

      const {
        error: fullError,
      } =
        await supabase.storage
          .from(
            "product-images",
          )
          .upload(
            fullPath,
            optimized.full,
            {
              contentType:
                "image/webp",
              upsert: false,
            },
          );

      if (fullError) {
        throw fullError;
      }

      const {
        error: thumbError,
      } =
        await supabase.storage
          .from(
            "product-images",
          )
          .upload(
            thumbPath,
            optimized.thumbnail,
            {
              contentType:
                "image/webp",
              upsert: false,
            },
          );

      if (thumbError) {
        await supabase.storage
          .from(
            "product-images",
          )
          .remove([
            fullPath,
          ]);

        throw thumbError;
      }

      const fullUrl =
        supabase.storage
          .from(
            "product-images",
          )
          .getPublicUrl(
            fullPath,
          ).data.publicUrl;

      const thumbUrl =
        supabase.storage
          .from(
            "product-images",
          )
          .getPublicUrl(
            thumbPath,
          ).data.publicUrl;

      await saveImage(
        fullUrl,
        thumbUrl,
      );

      const oldPaths = [
        storagePath(
          current.imageUrl,
        ),
        storagePath(
          current.thumbnailUrl,
        ),
      ].filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

      if (
        oldPaths.length
      ) {
        await supabase.storage
          .from(
            "product-images",
          )
          .remove(
            oldPaths,
          );
      }

      setCurrent({
        imageUrl: fullUrl,
        thumbnailUrl:
          thumbUrl,
      });

      setMessage(
        `Foto: ${Math.max(
          1,
          Math.round(
            optimized.full
              .size / 1024,
          ),
        )} KB · miniatura: ${Math.max(
          1,
          Math.round(
            optimized
              .thumbnail
              .size / 1024,
          ),
        )} KB.`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a foto.",
      );
    } finally {
      setLoading(false);

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }
    }
  }

  async function optimizeExisting() {
    if (
      !current.imageUrl
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response =
        await fetch(
          current.imageUrl,
          {
            cache:
              "no-store",
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "Não foi possível carregar a foto atual.",
        );
      }

      const blob =
        await response.blob();

      const type =
        ALLOWED.has(
          blob.type,
        )
          ? blob.type
          : "image/png";

      await upload(
        new File(
          [blob],
          "foto-atual",
          {
            type,
          },
        ),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível otimizar a foto atual.",
      );

      setLoading(false);
    }
  }

  async function remove() {
    if (
      !current.imageUrl &&
      !current.thumbnailUrl
    ) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const supabase =
      createClient();

    try {
      await saveImage(
        null,
        null,
      );

      const paths = [
        storagePath(
          current.imageUrl,
        ),
        storagePath(
          current.thumbnailUrl,
        ),
      ].filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

      if (paths.length) {
        await supabase.storage
          .from(
            "product-images",
          )
          .remove(paths);
      }

      setCurrent({
        imageUrl: null,
        thumbnailUrl: null,
      });

      setMessage(
        "Foto removida.",
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover a foto.",
      );
    } finally {
      setLoading(false);
    }
  }

  const technicalStatus =
    current.thumbnailUrl
      ? "Miniatura leve pronta para as listas"
      : current.imageUrl
        ? "Foto antiga sem miniatura"
        : "WebP completo + miniatura automática";

  return (
    <div className="product-image-slot">
      <div className="product-image-frame">
        {current.imageUrl ? (
          <img
            src={
              current.imageUrl
            }
            alt={label}
            loading="lazy"
          />
        ) : (
          <div className="product-image-placeholder">
            <ImagePlus
              size={34}
            />
            <span>
              Sem foto
            </span>
          </div>
        )}
      </div>

      <div className="product-image-slot-footer">
        <div>
          <strong>
            {label}
          </strong>

          <span>
            {helper ??
              technicalStatus}
          </span>
        </div>

        <div className="product-image-actions">
          {current.imageUrl &&
            !current.thumbnailUrl && (
              <button
                className="button ghost"
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void optimizeExisting()
                }
              >
                <WandSparkles
                  size={16}
                />
                Otimizar atual
              </button>
            )}

          <button
            className="button ghost"
            type="button"
            disabled={loading}
            onClick={() =>
              inputRef.current?.click()
            }
          >
            {loading ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : current.imageUrl ? (
              <RefreshCw
                size={16}
              />
            ) : (
              <ImagePlus
                size={16}
              />
            )}

            {loading
              ? "Processando"
              : current.imageUrl
                ? "Trocar"
                : "Adicionar"}
          </button>

          {current.imageUrl && (
            <button
              className="icon-button danger-icon"
              type="button"
              disabled={
                loading
              }
              aria-label={`Remover ${label}`}
              onClick={() =>
                void remove()
              }
            >
              <Trash2
                size={16}
              />
            </button>
          )}

          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(
              event,
            ) =>
              void upload(
                event.target
                  .files?.[0],
              )
            }
          />
        </div>
      </div>

      {message && (
        <p className="upload-message">
          {message}
        </p>
      )}
    </div>
  );
}

export function ProductImageUploader({
  productId,
  initialImageUrl,
  initialThumbnailUrl,
  initialSecondaryImageUrl,
  initialSecondaryThumbnailUrl,
}: {
  productId: string;
  initialImageUrl:
    | string
    | null;
  initialThumbnailUrl:
    | string
    | null;
  initialSecondaryImageUrl:
    | string
    | null;
  initialSecondaryThumbnailUrl:
    | string
    | null;
}) {
  return (
    <div className="product-image-grid">
      <Slot
        productId={productId}
        slot="primary"
        label="Foto principal"
        initial={{
          imageUrl:
            initialImageUrl,
          thumbnailUrl:
            initialThumbnailUrl,
        }}
      />

      <Slot
        productId={productId}
        slot="secondary"
        label="Imagem 2 · Informação nutricional"
        helper="Arte nutricional conferida em fonte oficial. Registre a fonte e aprove em Produtos > Nutrição IA."
        initial={{
          imageUrl:
            initialSecondaryImageUrl,
          thumbnailUrl:
            initialSecondaryThumbnailUrl,
        }}
      />
    </div>
  );
}
