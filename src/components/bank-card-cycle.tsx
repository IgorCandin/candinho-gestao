import { firstInstallmentMonth } from "@/lib/bank-planning";
import type { PlanningCard } from "@/lib/bank-planning-data";

export function BankCardCycle({ card, date }: { card: PlanningCard; date: string }) {
  const first = firstInstallmentMonth(date, card.closingDay, card.dueDay);
  const day = Number(date.slice(8, 10));
  const [year, month] = date.split("-").map(Number);
  const closing = card.closingDay ? Math.min(card.closingDay, new Date(Date.UTC(year, month, 0)).getUTCDate()) : null;
  const label = first ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}-01T12:00:00Z`)) : null;
  return <span className="bank-card-cycle">
    <small>Fecha: {card.closingDay ? `dia ${card.closingDay}` : "a cadastrar"} · Vence: {card.dueDay ? `dia ${card.dueDay}` : "a cadastrar"}</small>
    <small>{!date ? "Escolha a data da compra" : closing === null ? "Fechamento não informado" : day === closing ? "Fecha na data consultada · confirme com o banco" : day > closing ? "Fechamento deste mês já passou" : "Antes do fechamento deste mês"}</small>
    <small>{label ? `Compra nesta data: primeira parcela em ${label} (estimativa)` : "Cadastre fechamento e vencimento para estimar a fatura."}</small>
  </span>;
}
