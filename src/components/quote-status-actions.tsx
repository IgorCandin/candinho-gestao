import { RotateCcw, Trash2, UserX } from "lucide-react";

export function QuoteStatusActions({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  if (status === "confirmed") return null;

  const actionUrl = `/api/orcamentos/${quoteId}/status`;

  if (status !== "quoted") {
    return (
      <div className="quote-status-actions">
        <form action={actionUrl} method="post">
          <input type="hidden" name="status" value="quoted" />
          <button className="button ghost" type="submit">
            <RotateCcw size={16} />
            Reabrir orçamento
          </button>
        </form>
        <span className="form-help">
          Reabrir devolve o orçamento para o fluxo comercial. Nenhum estoque é movimentado.
        </span>
      </div>
    );
  }

  return (
    <div className="quote-status-actions">
      <form action={actionUrl} method="post">
        <input type="hidden" name="status" value="lost" />
        <button className="button ghost" type="submit">
          <UserX size={16} />
          Marcar como perdido
        </button>
      </form>

      <form action={actionUrl} method="post">
        <input type="hidden" name="status" value="cancelled" />
        <button className="button danger" type="submit">
          <Trash2 size={16} />
          Cancelar orçamento
        </button>
      </form>

      <span className="form-help">
        As duas ações encerram apenas a cotação e não movimentam estoque. O orçamento pode ser reaberto depois.
      </span>
    </div>
  );
}
