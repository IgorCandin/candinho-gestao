/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Smartphone,
  Trash2,
  Monitor,
} from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Slot = "desktop" | "mobile";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE = 14 * 1024 * 1024;

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("Não foi possível ler a imagem."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function optimizeBanner(file: File, slot: Slot) {
  const image = await loadImage(file);
  const maxWidth = slot === "desktop" ? 2200 : 1200;
  const maxHeight = slot === "desktop" ? 1200 : 1700;
  const targetBytes =
    slot === "desktop" ? 950 * 1024 : 700 * 1024;

  const scale = Math.min(
    1,
    maxWidth / image.naturalWidth,
    maxHeight / image.naturalHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(
    1,
    Math.round(image.naturalWidth * scale),
  );
  canvas.height = Math.max(
    1,
    Math.round(image.naturalHeight * scale),
  );

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Não foi possível otimizar o banner.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.9;
  let blob: Blob | null = null;

  do {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    quality -= 0.06;
  } while (blob && blob.size > targetBytes && quality >= 0.54);

  if (!blob) {
    throw new Error("Não foi possível converter o banner.");
  }

  return blob;
}

function storagePath(url: string | null) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);

  return index >= 0
    ? decodeURIComponent(url.slice(index + marker.length))
    : null;
}

function BannerSlot({
  productId,
  slot,
  label,
  description,
  currentUrl,
  onChanged,
}: {
  productId: string;
  slot: Slot;
  label: string;
  description: string;
  currentUrl: string | null;
  onChanged: (slot: Slot, url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function persist(imageUrl: string | null) {
    const response = await fetch(`/api/products/${productId}/banner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slot,
        image_url: imageUrl,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Não foi possível salvar o banner.");
    }
  }

  async function upload(file?: File) {
    if (!file || loading) return;

    setMessage(null);

    if (!ALLOWED.has(file.type)) {
      setMessage("Use JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_FILE) {
      setMessage("O arquivo original precisa ter no máximo 14 MB.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const token = crypto.randomUUID();
    const path = `${productId}/banner-${slot}-${token}.webp`;

    try {
      const optimized = await optimizeBanner(file, slot);

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, optimized, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(path).data.publicUrl;

      try {
        await persist(publicUrl);
      } catch (error) {
        await supabase.storage.from("product-images").remove([path]);
        throw error;
      }

      const oldPath = storagePath(currentUrl);
      if (oldPath) {
        await supabase.storage.from("product-images").remove([oldPath]);
      }

      onChanged(slot, publicUrl);
      setMessage(
        `Banner salvo · ${Math.max(
          1,
          Math.round(optimized.size / 1024),
        )} KB.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o banner.",
      );
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!currentUrl || loading) return;

    setLoading(true);
    setMessage(null);

    try {
      await persist(null);

      const oldPath = storagePath(currentUrl);
      if (oldPath) {
        await createClient()
          .storage.from("product-images")
          .remove([oldPath]);
      }

      onChanged(slot, null);
      setMessage("Banner removido.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o banner.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className={`v458-banner-slot ${slot}`}>
      <div className="v458-banner-slot-head">
        <span>
          {slot === "desktop" ? (
            <Monitor size={16} />
          ) : (
            <Smartphone size={16} />
          )}
        </span>
        <div>
          <strong>{label}</strong>
          <small>{description}</small>
        </div>
      </div>

      <div className="v458-banner-preview">
        {currentUrl ? (
          <img src={currentUrl} alt={`${label} do produto`} />
        ) : (
          <div>
            <ImagePlus size={26} />
            <span>Sem banner</span>
          </div>
        )}
      </div>

      <div className="v458-banner-actions">
        <button
          className="button ghost compact-button"
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? (
            <LoaderCircle className="spin" size={13} />
          ) : currentUrl ? (
            <RefreshCw size={13} />
          ) : (
            <ImagePlus size={13} />
          )}
          {currentUrl ? "Trocar" : "Adicionar"}
        </button>

        {currentUrl && (
          <button
            className="button ghost compact-button"
            type="button"
            disabled={loading}
            onClick={() => void remove()}
          >
            <Trash2 size={13} />
            Remover
          </button>
        )}

        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            void upload(event.target.files?.[0])
          }
        />
      </div>

      {message && <small className="v458-banner-message">{message}</small>}
    </article>
  );
}

export function ProductBannerUploader({
  productId,
  desktopUrl,
  mobileUrl,
  onChanged,
}: {
  productId: string;
  desktopUrl: string | null;
  mobileUrl: string | null;
  onChanged: (slot: Slot, url: string | null) => void;
}) {
  return (
    <section className="v458-banner-manager">
      <div className="v458-banner-manager-head">
        <div>
          <span className="eyebrow">Identidade do produto</span>
          <h3>Banner individual</h3>
          <p>
            Desktop aparece em telas largas. Mobile é opcional; se
            estiver vazio, o desktop será usado como fallback.
          </p>
        </div>
      </div>

      <div className="v458-banner-manager-grid">
        <BannerSlot
          productId={productId}
          slot="desktop"
          label="Banner desktop"
          description="Recomendado: arte horizontal, aproximadamente 2.5:1."
          currentUrl={desktopUrl}
          onChanged={onChanged}
        />

        <BannerSlot
          productId={productId}
          slot="mobile"
          label="Banner mobile"
          description="Opcional: composição vertical ou quadrada para telefone."
          currentUrl={mobileUrl}
          onChanged={onChanged}
        />
      </div>
    </section>
  );
}
