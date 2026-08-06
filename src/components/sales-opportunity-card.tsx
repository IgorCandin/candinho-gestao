import Link from "next/link";
import { CalendarClock, MessageSquareText, PackageSearch, Sparkles } from "lucide-react";
import { RadarFollowupButton } from "@/components/radar-followup-button";
import { SalesOpportunityFeedbackActions } from "@/components/sales-opportunity-feedback-actions";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";
import { formatCurrency, formatDateOnly } from "@/lib/format";

function groupLabel(value: string) {
  if (value === "recompra") return "Recompra";
  if (value === "creatina_candinho") return "Creatina Candinho";
  if (value === "produto_complementar") return "Complementar";
  return value.replaceAll("_", " ");
}

function priorityClass(value: string) {
  if (value === "Alta") return "red";
  if (value === "Média") return "orange";
  return "gray";
}

function feedbackLabel(value?: string | null) {
  if (value === "product_ended") return "Cliente confirmou que acabou";
  if (value === "still_using") return "Ainda está usando";
  if (value === "bought_elsewhere") return "Comprou de outra marca";
  if (value === "not_interested") return "Não demonstrou interesse";
  if (value === "later") return "Pediu para falar depois";
  if (value === "sale_completed") return "Venda registrada";
  if (value === "contacted") return "Contato recente";
  return null;
}

export function SalesOpportunityCard({
  opportunity,
  compact = false,
}: {
  opportunity: SalesOpportunity;
  compact?: boolean;
}) {
  const feedback = feedbackLabel(opportunity.last_feedback_status);

  return (
    <article className={`sales-opportunity-card-v45 ${compact ? "compact" : ""}`}>
      <header>
        <div>
          <div className="sales-opportunity-titleline">
            <span className={`badge ${priorityClass(opportunity.priority)}`}>
              {opportunity.priority}
            </span>
            <Link href={`/clientes/${opportunity.customer_id}`}>
              {opportunity.customer_name}
            </Link>
          </div>
          <small>
            {opportunity.city || opportunity.phone || "Sem localização"} ·{" "}
            {groupLabel(opportunity.opportunity_group)}
          </small>
        </div>
        <div className="sales-opportunity-score">
          <strong>{opportunity.opportunity_score}</strong>
          <span>score</span>
        </div>
      </header>

      <div className="sales-opportunity-product">
        <PackageSearch size={17} />
        <div>
          <span>Melhor oportunidade agora</span>
          <strong>
            {opportunity.recommended_product_name || "Produto a definir"}
          </strong>
          {opportunity.recommended_product_price != null && (
            <small>{formatCurrency(Number(opportunity.recommended_product_price))}</small>
          )}
        </div>
      </div>

      {!compact && (
        <div className="sales-opportunity-context">
          <div>
            <Sparkles size={13} />
            <span>
              <strong>Por quê</strong>
              <small>{opportunity.reason}</small>
            </span>
          </div>
          <div>
            <CalendarClock size={13} />
            <span>
              <strong>Momento</strong>
              <small>
                {opportunity.expected_action_on
                  ? formatDateOnly(opportunity.expected_action_on)
                  : "Sem data exata"}
                {opportunity.source_product_name
                  ? ` · origem: ${opportunity.source_product_name}`
                  : ""}
              </small>
            </span>
          </div>
        </div>
      )}

      {feedback && (
        <div className="sales-opportunity-feedback-state">
          <MessageSquareText size={13} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="sales-opportunity-recommendation">
        <span>{opportunity.recommended_action}</span>
        <RadarFollowupButton
          customerId={opportunity.customer_id}
          customerName={opportunity.customer_name}
          suggestedAction={opportunity.recommended_action}
        />
      </div>

      <SalesOpportunityFeedbackActions
        opportunity={opportunity}
        compact={compact}
      />
    </article>
  );
}
