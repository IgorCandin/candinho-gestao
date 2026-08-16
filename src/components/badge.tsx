import {
  getReservationStatusLabel,
  isReservationStatus,
  type ReservationStatusContext,
} from "@/lib/reservation-status";

const reservationColors = {
  reserved: "blue",
  partial: "orange",
  awaiting_stock: "orange",
  fulfilled: "green",
} as const;

const map: Record<string, { label: string; color: string }> = {
  finalized: { label: "Finalizado", color: "green" },
  active: { label: "Ativo", color: "blue" },
  pending: { label: "Pendente", color: "orange" },
  cancelled: { label: "Cancelado", color: "red" },
  received: { label: "Recebido", color: "green" },
  receivable: { label: "A receber", color: "orange" },
  delivered: { label: "Entregue", color: "green" },
  to_deliver: { label: "A entregar", color: "orange" },
  sale: { label: "Venda", color: "gold" },
  lead: { label: "Lead", color: "blue" },
  opening: { label: "Inicial", color: "gray" },
  purchase: { label: "Entrada", color: "green" },
  sale_movement: { label: "Venda", color: "red" },
  adjustment: { label: "Ajuste", color: "orange" },
  transfer_out: { label: "Transferência — saída", color: "red" },
  transfer_in: { label: "Transferência — entrada", color: "green" },
  cancellation: { label: "Estorno", color: "blue" },
  overdue_followup: { label: "Retorno atrasado", color: "red" },
  due_today: { label: "Retornar hoje", color: "orange" },
  pending_order: { label: "Pedido pendente", color: "blue" },
  lead_only: { label: "Somente lead", color: "gold" },
  inactive: { label: "Inativo", color: "gray" },
  care: { label: "Atenção", color: "orange" },
  lost: { label: "Perdido", color: "red" },
  quoted: { label: "Em orçamento", color: "gold" },
  expired: { label: "Vencido", color: "orange" },
  confirmed: { label: "Confirmado", color: "green" },
  planned: { label: "Agendado", color: "blue" },
  completed: { label: "Concluído", color: "green" },
  contact: { label: "Contato", color: "blue" },
  follow_up: { label: "Retorno", color: "orange" },
  post_sale: { label: "Pós-venda", color: "green" },
  note: { label: "Anotação", color: "gray" },
  available: { label: "Disponível", color: "green" },
  incoming: { label: "A caminho", color: "blue" },
  low_stock: { label: "Estoque baixo", color: "orange" },
  out_of_stock: { label: "Zerado", color: "red" },
};

export function Badge({
  value,
  reservationContext,
}: {
  value: string;
  reservationContext?: ReservationStatusContext;
}) {
  const item = isReservationStatus(value)
    ? {
        label: getReservationStatusLabel(
          value,
          reservationContext ?? "inventory",
        ),
        color: reservationColors[value],
      }
    : map[value]
    ? {
        ...map[value],
      }
    : { label: value.replaceAll("_", " "), color: "gray" };
  return <span className={`badge ${item.color}`}><span className="dot" />{item.label}</span>;
}
