import { RotateCcw, Trash2, UserX } from "lucide-react";
import { QuoteDeleteButton } from "@/components/quote-delete-button";

export function QuoteStatusActions({ quoteId, status }: { quoteId: string; status: string }) {
  if (status === "confirmed") return null;

  const actionUrl = `/api/orcamentos/${quoteId}/status`;

  if (status !== "quoted") {
    return (
      <div className="quote-status-actions">
        <form action={actionUrl} method="post">
          <input type="hidden" name="status" value="quoted" />
          <button className="button ghost" type="submit"><RotateCcw size={16} />Reabrir orçamento</button>
        </form>

        <QuoteDeleteButton quoteId={quoteId} />

        <span className="form-help">
          Reabrir devolve a proposta ao fluxo comercial. Excluir remove definitivamente o orçamento da lista e não movimenta estoque.
        </span>
      </div>
    );
  }

  return (
    <div className="quote-status-actions">
      <form action={actionUrl} method="post">
        <input type="hidden" name="status" value="lost" />
        <button className="button ghost" type="submit"><UserX size={16} />Marcar como perdido</button>
      </form>

      <form action={actionUrl} method="post">
        <input type="hidden" name="status" value="cancelled" />
        <button className="button ghost" type="submit"><Trash2 size={16} />Cancelar orçamento</button>
      </form>

      <QuoteDeleteButton quoteId={quoteId} />

      <span className="form-help">
        “Cancelar” mantém o orçamento no histórico e permite reabrir depois. “Excluir definitivamente” remove o registro da tela. Orçamentos já convertidos em venda ficam protegidos.
      </span>
    </div>
  );
}
