/* eslint-disable @next/next/no-img-element */
"use client";

import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_ORIGINAL = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function optimize(file: File) {
  const image = await loadImage(file);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível otimizar a imagem.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.82;
  let blob: Blob | null = null;
  do {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    quality -= 0.07;
  } while (blob && blob.size > 450 * 1024 && quality >= 0.48);
  if (!blob) throw new Error("Não foi possível converter a imagem.");
  return blob;
}

export function ComboImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    setMessage(null);
    if (!ALLOWED.has(file.type)) {
      setMessage("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_ORIGINAL) {
      setMessage("A imagem original precisa ter no máximo 10 MB.");
      return;
    }

    setLoading(true);
    try {
      const optimized = await optimize(file);
      const supabase = createClient();
      const path = `combos/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("product-images").upload(path, optimized, {
        contentType: "image/webp",
        upsert: false,
      });
      if (error) throw error;
      const publicUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      onChange(publicUrl);
      setMessage(`Foto pronta · ${Math.max(1, Math.round(optimized.size / 1024))} KB.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a foto do combo.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="combo-image-editor">
      <div className="combo-image-preview">
        {value ? <img src={value} alt="Prévia do combo" loading="lazy" /> : <div className="product-image-placeholder"><ImagePlus size={34} /><span>Sem foto</span></div>}
      </div>
      <div className="combo-image-copy">
        <strong>Foto do combo</strong>
        <span>Envie uma arte pelo celular ou computador. Ela é otimizada automaticamente para WEBP.</span>
        <div className="product-image-actions">
          <button className="button ghost" type="button" disabled={loading} onClick={() => inputRef.current?.click()}>
            {loading ? <LoaderCircle className="spin" size={16} /> : value ? <RefreshCw size={16} /> : <ImagePlus size={16} />}
            {loading ? "Processando" : value ? "Trocar foto" : "Adicionar foto"}
          </button>
          {value && <button className="button ghost" type="button" disabled={loading} onClick={() => { onChange(""); setMessage("Foto removida do combo. Salve para confirmar."); }}><Trash2 size={16}/>Remover</button>}
          <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} />
        </div>
        {message && <p className="upload-message">{message}</p>}
      </div>
    </div>
  );
}
