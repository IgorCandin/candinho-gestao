"use client";

import Link from "next/link";
import {
  ExternalLink,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

type FAQ = {
  question: string;
  answer: string;
};

export function PublicProductPageEditor({
  productId,
  productName,
  initial,
}: {
  productId: string;
  productName: string;
  initial: {
    slug: string;
    public_title: string | null;
    short_description: string | null;
    long_description: string | null;
    highlights: string[];
    usage_text: string | null;
    warnings_text: string | null;
    faq: FAQ[];
    meta_title: string | null;
    meta_description: string | null;
    whatsapp_message_template: string | null;
    published: boolean;
  };
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [title, setTitle] = useState(initial.public_title ?? productName);
  const [shortDescription, setShortDescription] = useState(
    initial.short_description ?? "",
  );
  const [longDescription, setLongDescription] = useState(
    initial.long_description ?? "",
  );
  const [usageText, setUsageText] = useState(initial.usage_text ?? "");
  const [warningsText, setWarningsText] = useState(initial.warnings_text ?? "");
  const [metaTitle, setMetaTitle] = useState(initial.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(
    initial.meta_description ?? "",
  );
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    initial.whatsapp_message_template ?? "",
  );
  const [published, setPublished] = useState(initial.published);
  const [highlightsText, setHighlightsText] = useState(
    initial.highlights.join("\n"),
  );
  const [faq, setFaq] = useState<FAQ[]>(initial.faq);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function generateDraft() {
    setGenerating(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/products/${productId}/public-page/generate`,
        { method: "POST" },
      );

      const payload = (await response.json()) as {
        public_title?: string;
        short_description?: string;
        long_description?: string;
        highlights?: string[];
        faq?: FAQ[];
        meta_title?: string;
        meta_description?: string;
        whatsapp_message_template?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error || "Não foi possível gerar o rascunho.",
        );
      }

      if (payload.public_title) setTitle(payload.public_title);
      if (payload.short_description != null) {
        setShortDescription(payload.short_description);
      }
      if (payload.long_description != null) {
        setLongDescription(payload.long_description);
      }
      if (Array.isArray(payload.highlights)) {
        setHighlightsText(payload.highlights.join("\n"));
      }
      if (Array.isArray(payload.faq)) {
        setFaq(
          payload.faq.filter(
            (item) => item && item.question && item.answer,
          ),
        );
      }
      if (payload.meta_title != null) setMetaTitle(payload.meta_title);
      if (payload.meta_description != null) {
        setMetaDescription(payload.meta_description);
      }
      if (payload.whatsapp_message_template != null) {
        setWhatsappTemplate(payload.whatsapp_message_template);
      }

      setFeedback(
        "Rascunho gerado. Revise antes de salvar — uso e advertências continuam manuais.",
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o rascunho.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/products/${productId}/public-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          public_title: title,
          short_description: shortDescription,
          long_description: longDescription,
          highlights: highlightsText
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          usage_text: usageText,
          warnings_text: warningsText,
          faq,
          meta_title: metaTitle,
          meta_description: metaDescription,
          whatsapp_message_template: whatsappTemplate,
          published,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        slug?: string;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Não foi possível salvar.");
      }

      if (payload.slug) setSlug(payload.slug);
      setFeedback("Página pública salva.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Página de venda pública</h2>
          <p>
            Esse conteúdo complementa os dados comerciais do produto sem
            misturar a ficha interna do ERP.
          </p>
        </div>

        {published && slug && (
          <Link
            className="button ghost"
            href={`/catalogo/${slug}`}
            target="_blank"
          >
            <ExternalLink size={16} />
            Abrir página
          </Link>
        )}
      </div>

      <div className="panel-body product-public-editor">
        <div className="form-grid two-columns">
          <label className="field">
            <span>Link</span>
            <div className="input">
              <small>/catalogo/</small>
              <input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                style={{
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  color: "inherit",
                  width: "100%",
                }}
              />
            </div>
          </label>

          <label className="field">
            <span>Título público</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Descrição curta</span>
          <textarea
            className="textarea"
            rows={3}
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            placeholder="Texto principal da página de venda."
          />
        </label>

        <label className="field">
          <span>Descrição completa</span>
          <textarea
            className="textarea"
            rows={6}
            value={longDescription}
            onChange={(event) => setLongDescription(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Destaques · um por linha</span>
          <textarea
            className="textarea"
            rows={5}
            value={highlightsText}
            onChange={(event) => setHighlightsText(event.target.value)}
            placeholder={"300 g\n100 doses\nCreatina monohidratada"}
          />
        </label>

        <div className="form-grid two-columns">
          <label className="field">
            <span>Como usar / orientação do rótulo</span>
            <textarea
              className="textarea"
              rows={4}
              value={usageText}
              onChange={(event) => setUsageText(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Advertências</span>
            <textarea
              className="textarea"
              rows={4}
              value={warningsText}
              onChange={(event) => setWarningsText(event.target.value)}
            />
          </label>
        </div>

        <div className="panel nested-panel">
          <div className="panel-head">
            <div>
              <h3>Perguntas frequentes</h3>
              <p>Mostradas na página pública.</p>
            </div>
            <button
              className="button ghost"
              type="button"
              onClick={() =>
                setFaq((current) => [
                  ...current,
                  { question: "", answer: "" },
                ])
              }
            >
              <Plus size={15} />
              Adicionar
            </button>
          </div>

          <div className="panel-body" style={{ display: "grid", gap: 10 }}>
            {faq.map((item, index) => (
              <div
                key={`faq-${index}`}
                className="form-grid two-columns"
                style={{ alignItems: "start" }}
              >
                <label className="field">
                  <span>Pergunta</span>
                  <input
                    className="input"
                    value={item.question}
                    onChange={(event) =>
                      setFaq((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, question: event.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>Resposta</span>
                  <div style={{ display: "flex", gap: 7 }}>
                    <textarea
                      className="textarea"
                      rows={3}
                      value={item.answer}
                      onChange={(event) =>
                        setFaq((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, answer: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <button
                      className="button ghost"
                      type="button"
                      aria-label="Remover pergunta"
                      onClick={() =>
                        setFaq((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index),
                        )
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </label>
              </div>
            ))}

            {faq.length === 0 && (
              <div className="empty compact">
                Nenhuma pergunta frequente cadastrada.
              </div>
            )}
          </div>
        </div>

        <div className="form-grid two-columns">
          <label className="field">
            <span>Título para compartilhamento / Google</span>
            <input
              className="input"
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Descrição para compartilhamento</span>
            <textarea
              className="textarea"
              rows={3}
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Modelo de mensagem de interesse</span>
          <textarea
            className="textarea"
            rows={3}
            value={whatsappTemplate}
            onChange={(event) => setWhatsappTemplate(event.target.value)}
            placeholder={`Oi! Vi ${productName} no catálogo e tenho interesse.`}
          />
        </label>

        <label className="check-row">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          <span>
            <strong>Página publicada</strong>
            <small>
              Se desligar, o link público deixa de abrir, mas o conteúdo fica
              salvo.
            </small>
          </span>
        </label>

        <div className="panel-actions">
          <button
            className="button ghost"
            type="button"
            disabled={generating || saving}
            onClick={() => void generateDraft()}
          >
            {generating ? <LoaderCircle size={16} /> : <Sparkles size={16} />}
            {generating ? "Gerando rascunho..." : "Gerar rascunho com Nexus"}
          </button>

          <button
            className="button gold"
            type="button"
            disabled={saving || generating}
            onClick={() => void save()}
          >
            {saving ? <LoaderCircle size={16} /> : <Save size={16} />}
            {saving ? "Salvando..." : "Salvar página"}
          </button>

          {feedback && <span className="form-help">{feedback}</span>}
        </div>
      </div>
    </section>
  );
}
