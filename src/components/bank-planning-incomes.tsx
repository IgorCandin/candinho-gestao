"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { PlanningIncome } from "@/lib/bank-planning";
import { formatCurrency } from "@/lib/format";
import { confirmPlannerIncome } from "@/app/(app)/bank/entradas/receipt-actions";

function IncomeConfirmation({ row, month }: { row: PlanningIncome; month: string }) {
  const [state, action, pending] = useActionState(confirmPlannerIncome, { message: "", ok: false });
  return <details><summary>{row.state === "received" ? "Corrigir valor ou data do recebimento" : "Conferir recebimento"}</summary><form action={action}>
    <input type="hidden" name="source_id" value={row.sourceId}/><input type="hidden" name="reference_month" value={month}/>
    <p>Registre somente após conferir o recebimento. Referência: {month.slice(0, 7)}. Não adiciona dinheiro automaticamente ao saldo.</p>
    <label>Total já recebido desta entrada neste mês (R$)<input name="amount" inputMode="decimal" required defaultValue={(row.state === "received" ? (row.confirmedAmount ?? row.amount) : (row.confirmedAmount ?? 0) + row.amount).toFixed(2).replace(".", ",")}/></label>
    <small>O valor substitui o total confirmado do mês; não é uma nova parcela somada. Já confirmado: {formatCurrency(row.confirmedAmount ?? 0)}.</small>
    <label>Data real do recebimento<input name="received_on" type="date" defaultValue={row.receivedOn ?? ""} required/></label>
    <button type="submit" disabled={pending}>{pending ? "Confirmando…" : row.state === "received" ? "Salvar correção do recebimento" : "Confirmar recebimento real"}</button>
    <p role="status">{state.message}</p>
  </form></details>;
}

export function BankPlanningIncomes({ incomes, month, canWrite }: { incomes: PlanningIncome[]; month: string; canWrite: boolean }) {
  return <section className="bank-planner-incomes" id="bank-incomes" aria-label="Entradas do mês"><h2>Entradas: previstas e conferidas</h2>
    <p>Previsões não são saldo disponível. Recebidos não são somados novamente ao saldo. Confira as contas após movimentações.</p>
    {!incomes.length ? <p>Nenhuma entrada com valor definido foi carregada para este mês.</p> : null}
    {incomes.map(row => <article className="bank-planning-income-row" key={row.id}><div className="bank-planning-income-heading"><strong>{row.title}</strong><span className="bank-planning-income-state" data-state={row.state}>{row.state === "received" ? "Recebido / conferido" : "Previsto / a conferir"}</span></div><p className="bank-planning-income-amount">{formatCurrency(row.amount)}{row.kind === "transfer" ? <small>Transferência, não renda</small> : null}</p>
      {canWrite ? row.sourceId ? <IncomeConfirmation key={`${month}:${row.id}`} row={row} month={month}/> : <Link href={row.href ?? "/company/concluir"}>Conferir e receber na origem</Link> : null}
    </article>)}
    <Link href="/bank/entradas">Gerenciar todas as entradas</Link>
    <aside><h3>13º · Igor e Giulia</h3><p>Valores e datas ainda não informados. Pendência de planejamento: não é lançamento financeiro nem recebimento confirmado e não foi incluída nos totais.</p><p>Quando souber, cadastre cada recebimento com seu valor e data previstos. Se houver duas parcelas, registre separadamente para distribuir nos meses corretos; confira antes se já existe para não duplicar.</p><Link href="/bank/entradas?acao=nova-receber">Cadastrar previsão quando souber valor e data</Link></aside>
  </section>;
}
