const ROUTES: Array<[string, string]> = [
  ["/pedidos-pendentes", "Pedidos pendentes"],
  ["/vendas/nova", "Nova venda"],
  ["/vendas", "Vendas"],
  ["/leads/novo", "Novo lead"],
  ["/leads", "Leads"],
  ["/clientes/radar/produtos", "Produto → clientes"],
  ["/clientes/radar", "Radar comercial"],
  ["/clientes", "CRM / Clientes"],
  ["/agenda", "Agenda"],
  ["/pos-venda", "Pós-venda"],
  ["/estoque", "Estoque"],
  ["/movimentacoes", "Movimentações"],
  ["/pedidos-fornecedor", "Compras"],
  ["/produtos", "Produtos"],
  ["/parceiros", "Parceiros"],
  ["/suplementos/saidas", "Saídas não-venda"],
  ["/suplementos/nexus/habitos", "Hábitos do Nexus"],
  ["/suplementos/nexus", "Nexus IA"],
  ["/suplementos/painel", "Gestão Suplementos"],
  ["/suplementos", "Suplementos · Hoje"],
  ["/fitness/produtos", "Fitness · Produtos"],
  ["/fitness/clientes", "Fitness · Clientes"],
  ["/fitness/vendas", "Fitness · Vendas"],
  ["/fitness", "Candinho Fitness"],
  ["/bank/entradas", "Bank · Entradas"],
  ["/bank/atualizar", "Bank · Atualizar"],
  ["/bank", "Candinho Bank"],
  ["/central", "Candinho Central"],
  ["/dashboard", "Candinho Company"],
  ["/catalogo", "Catálogo público"],
  ["/physique", "Candinho Physique"],
];

export function nexusRouteLabel(route: string) {
  const value = route || "/";
  const found = ROUTES.find(
    ([prefix]) => value === prefix || value.startsWith(`${prefix}/`),
  );
  if (found) return found[1];

  return value
    .replaceAll(":id", "detalhe")
    .split("/")
    .filter(Boolean)
    .join(" › ") || "Início";
}

export function nexusWorkflowLabel(steps: string[]) {
  return steps.map(nexusRouteLabel).join(" → ");
}

export function nexusRouteHref(route: string) {
  if (route.includes(":id")) return null;
  return route.startsWith("/") ? route : null;
}
