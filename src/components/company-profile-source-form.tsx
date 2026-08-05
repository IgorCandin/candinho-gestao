"use client";

import {
  CheckCircle2,
  ExternalLink,
  Link2,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./company-profile-v45.module.css";

type ProposedSection = {
  section_key: string;
  title: string;
  body: string;
  bullets: string[];
  confidence: number;
};

type AnalyzeResult = {
  source_id: string;
  source_title: string;
  source_url: string;
  summary: string;
  sections: ProposedSection[];
  error?: string;
};

export function CompanyProfileSourceForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<AnalyzeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function analyze() {
    if (!url.trim()) {
      setMessage("Cole o link da matéria primeiro.");
      return;
    }

    setAnalyzing(true);
    setPreview(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/central/apresentacao/link/analisar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        },
      );

      const payload = (await response.json()) as AnalyzeResult;

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível analisar a matéria.");
      }

      setPreview(payload);
      setMessage(
        payload.sections.length > 0
          ? "Prévia pronta. Confira antes de aplicar."
          : "A matéria foi lida, mas não trouxe informação institucional nova com segurança suficiente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível analisar a matéria.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function apply() {
    if (!preview || applying) return;

    setApplying(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/central/apresentacao/link/aplicar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_id: preview.source_id }),
        },
      );

      const payload = (await response.json()) as {
        updated_sections?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível aplicar a matéria.");
      }

      setMessage(
        `Fonte aprovada. ${payload.updated_sections ?? 0} seção(ões) atualizada(s).`,
      );
      setPreview(null);
      setUrl("");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar a matéria.",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className={styles.sourceBox}>
      <div className="company-profile-ai-guard">
        <Link2 size={18} />
        <span>
          Cole somente uma fonte que você queira usar. O Nexus não pesquisa a
          internet sozinho: lê este endereço, propõe mudanças e espera sua
          confirmação.
        </span>
      </div>

      <label className={styles.sourceInput}>
        <span>Link de matéria, entrevista ou publicação</span>
        <input
          className="input"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://site.com/materia-sobre-a-candinho"
        />
      </label>

      <button
        className="button gold"
        type="button"
        disabled={analyzing || !url.trim()}
        onClick={analyze}
      >
        {analyzing ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Sparkles size={16} />
        )}
        {analyzing ? "Nexus lendo a fonte" : "Analisar matéria"}
      </button>

      {preview && (
        <article className={styles.sourcePreview}>
          <h3>
            <ExternalLink size={14} /> {preview.source_title}
          </h3>
          <p>{preview.summary}</p>

          <div className={styles.previewSections}>
            {preview.sections.map((section) => (
              <article key={section.section_key}>
                <strong>{section.title}</strong>
                <span>
                  {section.section_key} · confiança{" "}
                  {Math.round(section.confidence * 100)}%
                </span>
              </article>
            ))}
          </div>

          {preview.sections.length > 0 && (
            <button
              className="button gold"
              type="button"
              disabled={applying}
              onClick={apply}
            >
              {applying ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {applying ? "Aplicando" : "Aprovar e atualizar apresentação"}
            </button>
          )}
        </article>
      )}

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
