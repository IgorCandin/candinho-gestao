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
};

export function Badge({ value }: { value: string }) {
  const item = map[value] ?? { label: value.replaceAll("_", " "), color: "gray" };
  return <span className={`badge ${item.color}`}><span className="dot" />{item.label}</span>;
}
