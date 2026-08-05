"use client";

import { Camera, LoaderCircle, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./physique-v45.module.css";

async function compressImage(file: File, maxSide = 1200, quality = 0.84) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Falha ao reduzir a foto."))),
      "image/webp",
      quality,
    );
  });

  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export function PhysiqueAthletePhotoManager({
  athleteId,
  currentPath,
  currentUrl,
}: {
  athleteId: string;
  currentPath: string | null;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!file || saving) return;

    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    let newPath: string | null = null;

    try {
      const prepared = await compressImage(file);
      newPath = `athletes/${athleteId}/profile/avatar-${Date.now()}.webp`;

      const upload = await supabase.storage
        .from("physique-training-files")
        .upload(newPath, prepared, {
          contentType: "image/webp",
          upsert: false,
        });

      if (upload.error) throw upload.error;

      const update = await supabase
        .from("physique_athletes")
        .update({
          avatar_path: newPath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", athleteId);

      if (update.error) throw update.error;

      if (currentPath && currentPath !== newPath) {
        await supabase.storage
          .from("physique-training-files")
          .remove([currentPath]);
      }

      setFile(null);
      setMessage("Foto principal atualizada.");
      router.refresh();
    } catch (error) {
      if (newPath) {
        await supabase.storage
          .from("physique-training-files")
          .remove([newPath]);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a foto.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.photoManager}>
      <div className={styles.photoPreview}>
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="Foto principal do atleta" />
        ) : (
          <UserRound size={30} />
        )}
      </div>

      <div className={styles.photoActions}>
        <label className={styles.fileLabel}>
          <Camera size={14} />
          {file ? file.name : "Escolher foto principal"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          className="physique-action-button secondary"
          type="button"
          disabled={!file || saving}
          onClick={save}
        >
          {saving ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
          {saving ? "Salvando" : "Salvar foto"}
        </button>
      </div>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
