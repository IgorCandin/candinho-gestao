/** Only destinations with an existing Company counterpart. Unknown URLs stay visible for audit. */
export function companyDestination(href: string): string {
  const match = href.match(/^(\/[^?#]*)(.*)$/);
  if (!match) return href;
  const path = match[1].replace(/^\/suplementos(?=\/)/, "");
  const suffix = match[2];
  // Central routes already have a Company rewrite, preserving their existing implementations.
  if (/^\/central(?:\/|$)/.test(match[1])) return match[1].replace(/^\/central/, "/company/gestao/central") + suffix;
  const inventory = path.match(/^\/estoque\/([0-9a-f-]{36})$/i);
  if (inventory) return `/company/estoque/${inventory[1]}${suffix}`;
  const fitnessConsignment = path.match(/^\/fitness\/consignacoes(?:\/([0-9a-f-]{36}|nova))?$/i);
  if (fitnessConsignment) return `/company/fitness/consignacoes${fitnessConsignment[1] ? `/${fitnessConsignment[1]}` : ""}${suffix}`;
  const extra: Record<string, string> = {
    "/parceiros/configuracao": "/company/parceiros/configuracao",
    "/parceiros/portal": "/company/parceiros/portal",
    "/estoque/sabores": "/company/estoque/sabores",
    "/parceiros/gerencial": "/company/parceiros/gerencial",
    "/parceiros/novo": "/company/parceiros/novo",
    "/fitness/conversoes": "/company/fitness/conversoes",
    "/fitness/estoque": "/company/estoque?operacao=fitness",
    "/fitness/estoque/inteligencia": "/company/estoque/fitness/inteligencia",
    "/fitness/movimentacoes": "/company/fitness/movimentacoes",
    "/fitness/pdfs": "/company/fitness/pdfs",
    "/fitness/nexus": "/company/fitness/nexus",
    "/fitness/pedidos": "/company/compras?operacao=fitness",
    "/fitness/pedidos/novo": "/company/compras/novo/fitness",
    "/suplementos/nexus": "/company/suplementos/nexus",
    "/suplementos/nexus/habitos": "/company/suplementos/nexus/habitos",
    "/nexus": "/company/suplementos/nexus",
    "/nexus/habitos": "/company/suplementos/nexus/habitos",
    "/leads": "/company/vender",
    "/agenda": "/company/gestao",
    "/vendas/nova": "/company/vendas/nova/suplementos",
    "/leads/novo": "/company/vendas/nova/suplementos",
    "/clientes/radar": "/company/clientes/radar",
    "/clientes/radar/produtos": "/company/clientes/radar/produtos",
    "/movimentacoes": "/company/estoque/movimentacoes",
    "/estoque/reconciliacao": "/company/estoque/reconciliacao",
    "/estoque/reconciliacao/contagem": "/company/estoque/reconciliacao/contagem",
    "/suplementos/saidas": "/company/estoque/despesa?operacao=supplements",
    "/pedidos-fornecedor/proximo-pedido": "/company/compras",
  };
  const extraDestination = extra[match[1]] ?? extra[path];
  if (extraDestination) return extraDestination + (extraDestination.includes("?") && suffix.startsWith("?") ? `&${suffix.slice(1)}` : suffix);
  const detail = path.match(/^\/(clientes|parceiros|produtos|vendas|pos-venda|pedidos-fornecedor)\/([0-9a-f-]{36})(\/editar)?$/i);
  if (detail) {
    const [, kind, id, edit = ""] = detail;
    if (edit && !["clientes", "parceiros"].includes(kind)) return href;
    const base = kind === "vendas" ? "/company/concluir" : kind === "pos-venda" ? "/company/acompanhar/suplementos" : kind === "pedidos-fornecedor" ? "/company/compras/suplementos" : `/company/${kind}`;
    return `${base}/${id}${kind === "clientes" ? "" : edit}${suffix}`;
  }
  const fitness = path.match(/^\/fitness\/(clientes|produtos|vendas|pos-venda)\/([0-9a-f-]{36})$/i);
  if (fitness) return `/company/${fitness[1] === "vendas" ? "concluir/fitness" : fitness[1] === "pos-venda" ? "acompanhar/fitness" : `${fitness[1]}/fitness`}/${fitness[2]}${suffix}`;
  const routes: Record<string, string> = { "/clientes": "/company/clientes", "/parceiros": "/company/parceiros", "/produtos": "/company/produtos", "/pos-venda": "/company/acompanhar", "/vendas": "/company/orcamentos", "/pedidos-pendentes": "/company/concluir", "/estoque": "/company/estoque", "/pedidos-fornecedor": "/company/compras", "/fornecedores": "/company/fornecedores" };
  return routes[path] ? routes[path] + suffix : href;
}
