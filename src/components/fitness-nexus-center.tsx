"use client";

import Link from "next/link";
import {
  Bot,
  Clipboard,
  LoaderCircle,
  Megaphone,
  PackageOpen,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  fitnessSignalCopy,
  type FitnessNexusProduct,
  type FitnessNexusSnapshot,
} from "@/lib/fitness-nexus-data";
import { formatCurrency } from "@/lib/format";
import styles from "./fitness-nexus.module.css";

type CampaignResult = {
  campaign_name?: string;
  strategy?: string;
  story_frames?: string[];
  caption?: string;
  cta?: string;
  price_note?: string | null;
  error?: string;
};

const QUICK = [
  "O que eu deveria fazer hoje?",
  "O que está parado no estoque?",
  "O que eu não deveria colocar em promoção agora?",
  "Qual produto vale divulgar primeiro?",
];

export function FitnessNexusCenter({
  snapshot,
}: {
  snapshot: FitnessNexusSnapshot;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [campaignProduct, setCampaignProduct] =
    useState<FitnessNexusProduct | null>(null);
  const [campaignContext, setCampaignContext] = useState("");
  const [campaign, setCampaign] = useState<CampaignResult | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);

  const priorityProducts = useMemo(
    () =>
      snapshot.products
        .filter((product) => product.signal_type !== "watch")
        .slice(0, 16),
    [snapshot.products],
  );

  async function ask(value?: string) {
    const prompt = (value ?? question).trim();
    if (prompt.length < 2 || asking) return;

    setQuestion(prompt);
    setAsking(true);
    setAnswer(null);

    try {
      const response = await fetch("/api/fitness/nexus/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "O Nexus não conseguiu responder.");
      }

      setAnswer(payload.answer ?? "");
    } catch (error) {
      setAnswer(
        error instanceof Error ? error.message : "O Nexus não conseguiu responder.",
      );
    } finally {
      setAsking(false);
    }
  }

  async function generateCampaign() {
    if (!campaignProduct || campaignLoading) return;

    setCampaignLoading(true);
    setCampaign(null);

    try {
      const response = await fetch("/api/fitness/nexus/campanha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: campaignProduct.product_id,
          additional_context: campaignContext,
        }),
      });

      const payload = (await response.json()) as CampaignResult;

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível gerar a campanha.");
      }

      setCampaign(payload);
    } catch (error) {
      setCampaign({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar a campanha.",
      });
    } finally {
      setCampaignLoading(false);
    }
  }

  async function copyCampaign() {
    if (!campaign) return;

    const text = [
      campaign.campaign_name,
      campaign.strategy,
      ...(campaign.story_frames ?? []).map(
        (frame, index) => `STORY ${index + 1}\n${frame}`,
      ),
      campaign.caption ? `LEGENDA\n${campaign.caption}` : null,
      campaign.cta ? `CTA\n${campaign.cta}` : null,
      campaign.price_note ? `PREÇO\n${campaign.price_note}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.writeText(text);
  }

  return (
    <div className={styles.center}>
      <div className={styles.centerHead}>
        <div>
          <span className={styles.eyebrow}>
            <Sparkles size={15} />
            Nexus Fitness
          </span>
          <h2>Copiloto da operação Fitness</h2>
          <p>
            O objetivo aqui é ser leve: apontar o que merece divulgação,
            reposição, cuidado com estoque e transformar isso em campanha
            simples.
          </p>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Vendas no mês</span>
          <strong>{snapshot.summary.month_sales}</strong>
          <small>{formatCurrency(snapshot.summary.month_revenue)} faturados</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Lucro no mês</span>
          <strong>{formatCurrency(snapshot.summary.month_profit)}</strong>
          <small>{formatCurrency(snapshot.summary.receivable_total)} a receber</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Unidades disponíveis</span>
          <strong>{snapshot.summary.available_units}</strong>
          <small>{snapshot.summary.incoming_units} a caminho</small>
        </div>
        <div className={styles.summaryCard}>
          <span>Pendências</span>
          <strong>
            {snapshot.summary.pending_delivery + snapshot.summary.pending_payment}
          </strong>
          <small>
            {snapshot.summary.pending_delivery} entrega(s) ·{" "}
            {snapshot.summary.pending_payment} pagamento(s)
          </small>
        </div>
      </div>

      <section className={styles.askBox}>
        <div>
          <span className={styles.eyebrow}>
            <Bot size={14} />
            Perguntar ao Nexus
          </span>
          <h2>Converse com a operação</h2>
        </div>

        <div className={styles.quickPrompts}>
          {QUICK.map((prompt) => (
            <button
              className="button ghost compact-button"
              type="button"
              key={prompt}
              onClick={() => void ask(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className={styles.askForm}>
          <textarea
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ex.: tenho que postar alguma coisa hoje. Qual peça você priorizaria?"
          />
          <button
            className="button gold"
            type="button"
            onClick={() => void ask()}
            disabled={asking || question.trim().length < 2}
          >
            {asking ? <LoaderCircle size={16} /> : <Send size={16} />}
            {asking ? "Analisando..." : "Perguntar"}
          </button>
        </div>

        {answer && <div className={styles.answer}>{answer}</div>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>O que merece ação</h2>
            <p>
              Estoque e giro organizados em decisão, não apenas em número.
            </p>
          </div>
          <PackageOpen size={19} />
        </div>

        <div className={`panel-body ${styles.productList}`}>
          {priorityProducts.map((product) => {
            const signal = fitnessSignalCopy(product);
            const canCampaign = ["promote", "stagnant", "momentum"].includes(
              product.signal_type,
            );

            return (
              <article className={styles.productCard} key={product.product_id}>
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles.productImage}
                    src={product.image_url}
                    alt={product.name}
                  />
                ) : (
                  <div className={styles.productImage} />
                )}

                <div className={styles.productCopy}>
                  <strong>{product.name}</strong>
                  <span>
                    {product.available_quantity} disponível(is) ·{" "}
                    {product.sold_90d} vendida(s) em 90 dias
                  </span>
                  <small>{signal.body}</small>
                </div>

                <div className={styles.productActions}>
                  <span
                    className={`${styles.badge} ${
                      signal.tone === "urgent"
                        ? styles.urgent
                        : signal.tone === "attention"
                          ? styles.attention
                          : signal.tone === "opportunity"
                            ? styles.opportunity
                            : signal.tone === "positive"
                              ? styles.positive
                              : styles.neutral
                    }`}
                  >
                    {signal.label}
                  </span>

                  {canCampaign ? (
                    <button
                      className="button ghost compact-button"
                      type="button"
                      onClick={() => {
                        setCampaignProduct(product);
                        setCampaign(null);
                      }}
                    >
                      <Megaphone size={14} />
                      Gerar campanha
                    </button>
                  ) : (
                    <Link
                      className="button ghost compact-button"
                      href={
                        product.signal_type === "reorder"
                          ? "/fitness/pedidos"
                          : `/fitness/produtos/${product.product_id}`
                      }
                    >
                      Abrir
                    </Link>
                  )}
                </div>
              </article>
            );
          })}

          {priorityProducts.length === 0 && (
            <div className="empty compact">
              Nenhuma prioridade forte encontrada agora.
            </div>
          )}
        </div>
      </section>

      {campaignProduct && (
        <section className={styles.campaign}>
          <div className={styles.centerHead}>
            <div>
              <span className={styles.eyebrow}>
                <Megaphone size={14} />
                Campanha assistida
              </span>
              <h2>{campaignProduct.name}</h2>
              <p>
                O preço sugerido, quando existe, é calculado antes da IA. O
                Nexus escreve a campanha, mas não inventa desconto.
              </p>
            </div>

            <button
              className="button ghost"
              type="button"
              onClick={() => {
                setCampaignProduct(null);
                setCampaign(null);
              }}
            >
              Fechar
            </button>
          </div>

          {campaignProduct.suggested_discount_pct > 0 && (
            <div className={styles.answer}>
              Sugestão operacional:{" "}
              <strong>{campaignProduct.suggested_discount_pct}%</strong>
              {campaignProduct.suggested_price != null
                ? ` · ${formatCurrency(campaignProduct.suggested_price)}`
                : ""}
              {!campaignProduct.cost_complete
                ? " · custo incompleto: revisar antes de publicar."
                : ""}
            </div>
          )}

          <textarea
            rows={3}
            value={campaignContext}
            onChange={(event) => setCampaignContext(event.target.value)}
            placeholder="Observação opcional: quero algo para Story hoje, chegou cor nova, quero campanha sem desconto..."
          />

          <div className="panel-actions">
            <button
              className="button gold"
              type="button"
              onClick={() => void generateCampaign()}
              disabled={campaignLoading}
            >
              {campaignLoading ? <LoaderCircle size={16} /> : <Megaphone size={16} />}
              {campaignLoading ? "Gerando..." : "Gerar campanha"}
            </button>

            {campaign && !campaign.error && (
              <button
                className="button ghost"
                type="button"
                onClick={() => void copyCampaign()}
              >
                <Clipboard size={15} />
                Copiar tudo
              </button>
            )}
          </div>

          {campaign?.error && (
            <div className={styles.answer}>{campaign.error}</div>
          )}

          {campaign && !campaign.error && (
            <div className={styles.campaignResult}>
              <div className={styles.answer}>
                <strong>{campaign.campaign_name}</strong>
                {"\n"}
                {campaign.strategy}
              </div>

              <div className={styles.frames}>
                {(campaign.story_frames ?? []).map((frame, index) => (
                  <div className={styles.frame} key={`${index}-${frame.slice(0, 20)}`}>
                    <strong>STORY {index + 1}</strong>
                    {"\n\n"}
                    {frame}
                  </div>
                ))}
              </div>

              {campaign.caption && (
                <div className={styles.answer}>
                  <strong>Legenda</strong>
                  {"\n"}
                  {campaign.caption}
                </div>
              )}

              {campaign.cta && (
                <div className={styles.answer}>
                  <strong>CTA</strong>
                  {"\n"}
                  {campaign.cta}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
