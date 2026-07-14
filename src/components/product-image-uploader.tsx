/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ImageField = "image_url" | "secondary_image_url";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function ProductImageSlot({
  productId,
  field,
  label,
  imageUrl,
  onUploaded,
}: {
  productId: string;
  field: ImageField;
  label: string;
  imageUrl: string | null;
  onUploaded: (field: ImageField, url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setMessage(null);

    const extension = MIME_TO_EXTENSION[file.type];
    if (!extension) {
      setMessage("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage("A imagem precisa ter no máximo 10 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const path = `${productId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from("products")
        .update({ [field]: publicUrl })
        .eq("id", productId);
      if (updateError) throw updateError;

      onUploaded(field, publicUrl);
      setMessage("Foto atualizada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="product-image-slot">
      <div className="product-image-frame">
        {imageUrl ? (
          <img src={imageUrl} alt={label} />
        ) : (
          <div className="product-image-placeholder"><ImagePlus size={34} /><span>Sem foto</span></div>
        )}
      </div>
      <div className="product-image-slot-footer">
        <div><strong>{label}</strong><span>JPG, PNG ou WEBP · até 10 MB</span></div>
        <button className="button ghost" type="button" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <LoaderCircle className="spin" size={16} /> : imageUrl ? <RefreshCw size={16} /> : <ImagePlus size={16} />}
          {isUploading ? "Enviando" : imageUrl ? "Trocar foto" : "Adicionar foto"}
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
      {message && <p className="upload-message">{message}</p>}
    </div>
  );
}

export function ProductImageUploader({
  productId,
  initialImageUrl,
  initialSecondaryImageUrl,
}: {
  productId: string;
  initialImageUrl: string | null;
  initialSecondaryImageUrl: string | null;
}) {
  const router = useRouter();
  const [images, setImages] = useState({
    image_url: initialImageUrl,
    secondary_image_url: initialSecondaryImageUrl,
  });

  function handleUploaded(field: ImageField, url: string) {
    setImages((current) => ({ ...current, [field]: url }));
    router.refresh();
  }

  return (
    <div className="product-image-grid">
      <ProductImageSlot
        productId={productId}
        field="image_url"
        label="Foto principal"
        imageUrl={images.image_url}
        onUploaded={handleUploaded}
      />
      <ProductImageSlot
        productId={productId}
        field="secondary_image_url"
        label="Segunda foto"
        imageUrl={images.secondary_image_url}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
