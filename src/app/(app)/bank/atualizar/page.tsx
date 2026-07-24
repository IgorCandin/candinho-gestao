import Link from "next/link";
import {
  CheckCircle2,
  Landmark,
  Save,
} from "lucide-react";
import { getBankAccounts } from "@/lib/bank-data";
import { formatDateOnly } from "@/lib/format";
import { saveBankQuickUpdate } from "./actions";

function todayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function inputMoney(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return Number(value)
    .toFixed(2)
    .replace(".", ",");
}

export default async function BankQuickUpdatePage({
  searchParams,
}: {
  searchParams: Promise<{
    salvo?: string;
    data?: string;
  }>;
}) {
  const params = await searchParams;
  const accounts = await getBankAccounts();

  const balanceDate =
    params.data &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.data)
      ? params.data
      : todayInBrazil();

  return (
    <section>
      <div className="page-header bank-page-header">
        <div>
          <div className="eyebrow">
            Candinho Bank
          </div>
          <h1>Atualizar saldos</h1>
          <p>
            Esta rotina agora serve somente
            para informar quanto existe em
            cada conta ou carteira. Faturas
            continuam no módulo Faturas.
          </p>
        </div>

        <span className="bank-module-badge">
          <Landmark size={16} />
          Saldo real
        </span>
      </div>

      {params.salvo && (
        <div className="bank-success-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>
              Saldos atualizados com sucesso.
            </strong>
            <span>
              O Dashboard já usa os valores de{" "}
              {formatDateOnly(balanceDate)}.
            </span>
          </div>
        </div>
      )}

      <form
        action={saveBankQuickUpdate}
        className="bank-manual-update-form"
      >
        <article className="panel bank-manual-update-settings">
          <div className="panel-head">
            <div>
              <h2>Data da atualização</h2>
              <p>
                Use a data em que você conferiu
                os saldos reais.
              </p>
            </div>
          </div>

          <div className="panel-body bank-charge-form-grid">
            <label className="field">
              <span>Data dos saldos</span>
              <input
                className="input"
                type="date"
                name="balance_date"
                defaultValue={balanceDate}
                required
              />
            </label>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Saldos das contas</h2>
              <p>
                Atualize somente o que mudou.
                Campo vazio preserva o último
                saldo registrado.
              </p>
            </div>

            <Link
              className="bank-panel-link"
              href="/bank/contas"
            >
              Gerenciar contas
            </Link>
          </div>

          <div className="panel-body bank-manual-update-list">
            {accounts.map((account) => {
              const id = String(account.id);

              return (
                <div
                  className="bank-manual-update-row"
                  key={id}
                >
                  <input
                    type="hidden"
                    name="account_id"
                    value={id}
                  />

                  <div>
                    <strong>
                      {String(
                        account.name ?? "Conta",
                      )}
                    </strong>
                    <span>
                      {String(
                        account.origin ??
                          account.account_type ??
                          "Conta",
                      )}
                    </span>
                  </div>

                  <label className="field">
                    <span>Saldo atual</span>
                    <div className="bank-money-input">
                      <b>R$</b>
                      <input
                        className="input"
                        name={`balance:${id}`}
                        inputMode="decimal"
                        defaultValue={inputMoney(
                          account.balance,
                        )}
                      />
                    </div>
                  </label>

                  <small>
                    {account.balance_date
                      ? `Último registro: ${formatDateOnly(
                          String(
                            account.balance_date,
                          ),
                        )}`
                      : "Nunca atualizado"}
                  </small>
                </div>
              );
            })}

            {accounts.length === 0 && (
              <div className="bank-empty-state">
                Nenhuma conta cadastrada.
              </div>
            )}
          </div>
        </article>

        <div className="bank-manual-update-submit">
          <div>
            <Landmark size={20} />
            <span>
              <strong>
                Esta tela altera somente
                saldos.
              </strong>{" "}
              Nenhuma fatura, dívida ou conta
              a receber será modificada.
            </span>
          </div>

          <button
            className="button gold"
            type="submit"
          >
            <Save size={16} />
            Salvar saldos
          </button>
        </div>
      </form>
    </section>
  );
}
