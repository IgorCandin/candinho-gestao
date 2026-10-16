/** Only destinations with an existing Company counterpart. Unknown URLs stay visible for audit. */
export function companyDestination(href: string): string {
  const match = href.match(/^(\/[^?#]*)(.*)$/);
  if (!match) return href;
  const path = match[1].replace(/^\/suplementos(?=\/)/, "");
  const suffix = match[2];
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
