type CareKind = "post_sale" | "follow_up" | "waiting";
export function careGuidance(kind: CareKind) {
  if (kind === "post_sale") return { instruction: "Pergunte como foi a experiência com a compra e registre a resposta.", openLabel: "Registrar pós-venda", completeLabel: "Concluir pós-venda" };
  if (kind === "follow_up") return { instruction: "Retome o contato combinado e registre o resultado da conversa.", openLabel: "Registrar retorno", completeLabel: "Concluir retorno" };
  return { instruction: "Confira se houve resposta e registre o próximo passo deste contato.", openLabel: "Atualizar contato", completeLabel: "Encerrar contato" };
}
export function careContactKey(item: { operation: string; customerId: string }) {
  return `${item.operation}:${item.customerId}`;
}
