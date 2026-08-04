import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { getBankCardsAndInvoices } from "@/lib/bank-data";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import { saveCurrentMonthInvoices } from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentMonth() {
  return `${todayInBrazil().slice(0, 7)}-01`;
}

function inputMoney(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  return Number(value).toFixed(2).replace(".", ",");
}

export default async function QuickInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const params = await searchParams;
  const { cards, invoices } = await getBankCardsAndInvoices();
  const referenceMonth = currentMonth();

  const currentInvoices = new Map(
    invoices
      .filter(
        (invoice) =>
          String(invoice.reference_month ?? "") === referenceMonth,
      )
      .map((invoice) => [
        String(invoice.card_id),
        invoice,
      ]),
  );

  return (
    <section className="bank-quick-invoices">
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">Candinho Bank</div>
          <h1>Lançar faturas</h1>
          <p>
            {formatMonthYear(referenceMonth)} · informe o valor deste mês em
            cada cartão e salve tudo de uma vez.
          </p>
        </div>

        <div className="bank-header-actions">
          <Link className="button ghost" href="/bank/faturas">
            <ChevronLeft size={16} />
            Voltar
          </Link>
          <Link
            className="button ghost"
            href="/bank/faturas?acao=atualizar"
          >
            <SlidersHorizontal size={16} />
            Edição avançada
          </Link>
        </div>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Faturas deste mês salvas.</strong>
            <span>
              O Dashboard já usa os valores informados.
            </span>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <article className="panel">
          <div className="empty">
            <CreditCard size={28} />
            <strong>Nenhum cartão cadastrado.</strong>
            Cadastre um cartão primeiro na tela de Faturas.
          </div>
        </article>
      ) : (
        <form action={saveCurrentMonthInvoices}>
          <input
            type="hidden"
            name="reference_month"
            value={referenceMonth}
          />

          <article className="panel bank-quick-invoice-panel">
            <div className="panel-head">
              <div>
                <h2>Faturas de {formatMonthYear(referenceMonth)}</h2>
                <p>
                  Campo vazio não altera o cartão. Fatura já paga fica
                  bloqueada.
                </p>
              </div>
              <span className="bank-module-badge">
                <CreditCard size={15} />
                {cards.length}
              </span>
            </div>

            <div className="bank-quick-invoice-list">
              {cards.map((card) => {
                const cardId = String(card.id);
                const invoice = currentInvoices.get(cardId);
                const paid = String(invoice?.status ?? "") === "paid";

                return (
                  <div className="bank-quick-invoice-row" key={cardId}>
                    <input type="hidden" name="card_id" value={cardId} />

                    <div className="bank-quick-invoice-card">
                      <strong>{String(card.name ?? "Cartão")}</strong>
                      <span>
                        {String(
                          card.holder_name ??
                            card.institution ??
                            "Sem titular informado",
                        )}
                        {card.due_day
                          ? ` · vence dia ${String(card.due_day)}`
                          : ""}
                      </span>
                    </div>

                    <label className="field">
                      <span>Valor da fatura</span>
                      <div className="bank-money-input">
                        <b>R$</b>
                        <input
                          className="input"
                          name={`amount:${cardId}`}
                          inputMode="decimal"
                          placeholder="0,00"
                          defaultValue={inputMoney(invoice?.amount)}
                          disabled={paid}
                        />
                      </div>
                    </label>

                    <div className="bank-quick-invoice-status">
                      {paid ? (
                        <span className="badge green">Paga</span>
                      ) : invoice?.amount !== null &&
                        invoice?.amount !== undefined ? (
                        <span className="badge gray">
                          {formatCurrency(Number(invoice.amount))}
                        </span>
                      ) : (
                        <span className="badge gray">Não informada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <div className="bank-quick-invoice-savebar">
            <span>
              Informe só o que você sabe agora. Os campos vazios ficam como
              estão.
            </span>
            <button className="button gold" type="submit">
              <Save size={16} />
              Salvar faturas deste mês
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
