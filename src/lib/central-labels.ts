export const CENTRAL_LABELS = [
  { key: "", label: "Sem etiqueta" },
  { key: "novo_lead", label: "Novo lead" },
  { key: "orcamento", label: "Orçamento enviado" },
  { key: "aguardando", label: "Aguardando resposta" },
  { key: "pagamento", label: "Aguardando pagamento" },
  { key: "venda", label: "Venda fechada" },
  { key: "urgente", label: "Problema / Urgente" },
  { key: "pos_venda", label: "Pós-venda" },
  { key: "parceiro", label: "Parceiro" },
] as const;

export function labelName(key?: string | null) {
  return CENTRAL_LABELS.find((item) => item.key === (key ?? ""))?.label ?? "Sem etiqueta";
}
