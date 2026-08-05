"use client";

import {
  Camera,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PhysiqueShapeAnalysis } from "@/lib/physique-visual-data";
import styles from "./physique-v45.module.css";

type ShapeResult = PhysiqueShapeAnalysis & {
  provider?: string | null;
  model?: string | null;
};

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto.");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Falha ao reduzir a foto."))),
      "image/webp",
      0.8,
    );
  });

  return new File([blob], `shape-${Date.now()}.webp`, {
    type: "image/webp",
  });
}

export function PhysiqueShapeAnalysisBox({
  athleteId,
  athleteName,
  history,
}: {
  athleteId: string;
  athleteName: string;
  history: PhysiqueShapeAnalysis[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<Array<File | null>>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShapeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function setAt(index: number, file: File | null) {
    setFiles((current) =>
      current.map((item, position) => (position === index ? file : item)),
    );
  }

  async function analyze() {
    const selected = files.filter((file): file is File => Boolean(file));

    if (selected.length === 0) {
      setMessage("Escolha pelo menos uma foto.");
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage(null);

    try {
      const prepared = await Promise.all(selected.map((file) => compressImage(file)));
      const form = new FormData();
      form.set("athlete_id", athleteId);
      prepared.forEach((file) => form.append("images", file));

      const response = await fetch("/api/physique/avaliar-shape", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as ShapeResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível avaliar o shape.");
      }

      setResult(payload);
      setFiles([null, null, null]);
      setMessage(
        "Análise salva no histórico. Ela é visual e comparativa; não estima percentual de gordura nem substitui avaliação profissional.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível avaliar o shape.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.shapeBox}>
      <div className={styles.shapeHead}>
        <Sparkles size={20} />
        <div>
          <strong>Avaliar shape com Nexus</strong>
          <span>
            Uso manual e econômico. As fotos são reduzidas antes do envio e o Nexus
            descreve somente aspectos visuais de desenvolvimento, simetria e prioridades.
          </span>
        </div>
      </div>

      <div className={styles.shapeFiles}>
        {["Frente", "Lateral", "Costas"].map((label, index) => (
          <label key={label}>
            <Camera size={18} />
            <b>{label}</b>
            <span>{files[index]?.name ?? "Escolher foto"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setAt(index, event.target.files?.[0] ?? null)}
            />
          </label>
        ))}
      </div>

      <button
        className="physique-action-button secondary"
        type="button"
        disabled={loading || files.every((file) => !file)}
        onClick={analyze}
      >
        {loading ? (
          <LoaderCircle className="spin" size={15} />
        ) : (
          <Sparkles size={15} />
        )}
        {loading ? "Nexus analisando" : `Avaliar shape de ${athleteName}`}
      </button>

      {message && <p className={styles.message}>{message}</p>}

      {result && (
        <article className={styles.analysis}>
          <h3>
            <CheckCircle2 size={15} /> Análise atual
          </h3>
          <p>{result.summary}</p>

          <div className={styles.analysisGrid}>
            <section>
              <strong>Pontos que se destacam</strong>
              <ul>
                {result.strengths.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
            <section>
              <strong>Prioridades visuais</strong>
              <ul>
                {result.priorities.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          </div>

          {result.symmetry_notes && <p><b>Simetria:</b> {result.symmetry_notes}</p>}
          {result.posing_notes && <p><b>Fotos/pose:</b> {result.posing_notes}</p>}
          {result.limitations && <p><b>Limites da leitura:</b> {result.limitations}</p>}
        </article>
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <strong>Histórico de análises visuais</strong>
          {history.map((item) => (
            <article key={item.id}>
              <small>{item.analyzed_on}</small>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
