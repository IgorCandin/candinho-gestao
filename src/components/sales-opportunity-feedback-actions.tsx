"use client";

import { Check, Clock3, LoaderCircle, PackageCheck, PackageX, ShoppingBag, ThumbsDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SalesOpportunity } from "@/lib/commercial-opportunity-types";

type FeedbackStatus =
  | "contacted"
  | "still_using"
  | "product_ended"
  | "not_interested"
  | "bought_elsewhere"
  | "later"
  | "sale_completed"
  | "dismissed";

function futureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SalesOpportunityFeedbackActions({
  opportunity,
  compact = false,
}: {
  opportunity: SalesOpportunity;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<FeedbackStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(status: FeedbackStatus) {
    if (loading) return;
    setLoading(status);
    setMessage(null);

    const nextAction =
      status === "still_using"
        ? futureDate(14)
        : status === "later"
          ? futureDate(7)
          : null;

    try {
      const response = await fetch(
        `/api/customers/${opportunity.customer_id}/sales-opportunities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recommended_product_id: opportunity.recommended_product_id,
            opportunity_group: opportunity.opportunity_group,
            opportunity_subtype: opportunity.opportunity_subtype,
            feedback_status: status,
            next_action_on: nextAction,
          }),
        },
      );

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível registrar.");

      setMessage(
        status === "product_ended"
          ? "Confirmado: produto acabou. Oportunidade continua quente."
          : status === "still_using"
            ? "Pausado por 14 dias."
            : status === "later"
              ? "Pausado por 7 dias."
              : status === "sale_completed"
                ? "Marcado como venda realizada."
                : "Feedback salvo.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setLoading(null);
    }
  }

  const actions: Array<{
    status: FeedbackStatus;
    label: string;
    icon: typeof Check;
    tone?: string;
  }> = [
    { status: "product_ended", label: "Acabou", icon: PackageCheck, tone: "hot" },
    { status: "still_using", label: "Ainda usa", icon: Clock3 },
    { status: "later", label: "Depois", icon: Clock3 },
    { status: "bought_elsewhere", label: "Outra marca", icon: PackageX },
    { status: "not_interested", label: "Não quer", icon: ThumbsDown },
    { status: "sale_completed", label: "Vendeu", icon: ShoppingBag, tone: "success" },
  ];

  return (
    <div className={`sales-feedback-wrap ${compact ? "compact" : ""}`}>
      <div className="sales-feedback-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.status}
              type="button"
              className={`sales-feedback-button ${action.tone ?? ""}`}
              disabled={Boolean(loading)}
              onClick={() => void save(action.status)}
            >
              {loading === action.status ? (
                <LoaderCircle className="spin" size={12} />
              ) : (
                <Icon size={12} />
              )}
              {action.label}
            </button>
          );
        })}
      </div>
      {message && <small className="sales-feedback-message">{message}</small>}
    </div>
  );
}
