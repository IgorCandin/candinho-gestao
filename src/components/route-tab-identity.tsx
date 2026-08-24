"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Operation =
  | "company"
  | "bank"
  | "fitness"
  | "supplements"
  | "central"
  | "physique";

const FAVICON_VERSION = "45.47.0";

const OPERATION = {
  company: {
    suffix: "Company",
    brandTitle: "Candinho Company",
    icon: "/favicons/cc-v44.png",
  },
  bank: {
    suffix: "Bank",
    brandTitle: "Candinho Bank",
    icon: "/favicons/cb-v44.png",
  },
  fitness: {
    suffix: "Fitness",
    brandTitle: "Candinho Fitness",
    icon: "/favicons/cf-v44.png",
  },
  supplements: {
    suffix: "Suplementos",
    brandTitle: "Candinho Suplementos",
    icon: "/favicons/cs-v44.png",
  },
  central: {
    suffix: "Central",
    brandTitle: "Candinho Central",
    icon: "/favicons/cce-v44.png",
  },
  physique: {
    suffix: "Physique",
    brandTitle: "Candinho Physique",
    icon: "/favicons/cc-v44.png",
  },
} satisfies Record<Operation, { suffix: string; brandTitle: string; icon: string }>;

const LABELS: Array<[string, string]> = [
  ["/central/marketing/produtos", "Produtos e fotos"],
  ["/central/marketing/planejamento", "Planejamento de marketing"],
  ["/central/marketing/ideias", "Ideias e roteiros"],
  ["/central/agenda-estrategica", "Agenda Estratégica"],
  ["/central/meu-dia", "Meu Dia"],
  ["/central/prioridades", "Prioridades"],
  ["/central/promocoes", "Promoções"],
  ["/central/rupturas", "Rupturas"],
  ["/central/respostas", "Respostas rápidas"],
  ["/central/integracoes", "Integrações"],
  ["/central/governanca", "Governança"],
  ["/central/pendencias", "Pendências"],
  ["/central/clientes", "Clientes"],
  ["/central/alertas", "Alertas"],
  ["/central/agenda", "Agenda Global"],
  ["/central/marketing", "Marketing"],
  ["/central/busca", "Busca Global"],
  ["/central/midia", "Mídia"],
  ["/central/inicio", "Menu"],
  ["/nexus/qualidade", "Qualidade"],
  ["/nexus/rotinas", "Rotinas"],
  ["/nexus/fila", "Fila Nexus"],
  ["/nexus", "Nexus"],
  ["/fitness/pedidos/novo", "Novo pedido"],
  ["/fitness/vendas/nova", "Nova venda"],
  ["/fitness/movimentacoes", "Movimentações"],
  ["/fitness/fornecedores", "Fornecedores"],
  ["/fitness/clientes", "Clientes"],
  ["/fitness/produtos", "Produtos"],
  ["/fitness/estoque", "Estoque"],
  ["/fitness/agenda", "Agenda"],
  ["/fitness/pedidos", "Pedidos"],
  ["/fitness/vendas", "Setor de Vendas"],
  ["/fitness/painel", "Painel gerencial"],
  ["/fitness/inicio", "Tela inicial"],
  ["/bank/faturas/rapido", "Lançar faturas"],
  ["/bank/emprestimos", "Empréstimos"],
  ["/bank/mensalidades", "Planos e mensalidades"],
  ["/bank/visao-anual", "Visão anual"],
  ["/bank/fechamento", "Histórico mensal"],
  ["/bank/operacoes", "Operações a receber"],
  ["/bank/cobrancas", "Cobranças"],
  ["/bank/atualizar", "Atualizar saldos"],
  ["/bank/entradas", "Entradas"],
  ["/bank/faturas", "Faturas"],
  ["/bank/contas", "Contas e carteiras"],
  ["/bank/organizar", "Caixa"],
  ["/bank/nexus", "Nexus Bank"],
  ["/bank/inicio", "Tela inicial"],
  ["/suplementos/pedidos-fornecedor", "Pedidos de fornecedor"],
  ["/suplementos/pedidos-pendentes", "Pedidos pendentes"],
  ["/suplementos/movimentacoes", "Movimentações"],
  ["/suplementos/fornecedores", "Fornecedores"],
  ["/suplementos/vendas/nova", "Nova venda"],
  ["/suplementos/orcamentos", "Orçamentos"],
  ["/suplementos/pos-venda", "Pós-venda"],
  ["/suplementos/parceiros", "Parceiros"],
  ["/suplementos/produtos", "Produtos"],
  ["/suplementos/clientes", "CRM"],
  ["/suplementos/estoque", "Estoque e Compras"],
  ["/suplementos/agenda", "Agenda"],
  ["/suplementos/leads", "Leads"],
  ["/suplementos/vendas", "Comercial"],
  ["/suplementos/painel", "Gestão"],
  ["/suplementos/hoje", "Home"],
  ["/pedidos-fornecedor", "Pedidos de fornecedor"],
  ["/pedidos-pendentes", "Pedidos pendentes"],
  ["/movimentacoes", "Movimentações"],
  ["/fornecedores", "Fornecedores"],
  ["/vendas/nova", "Nova venda"],
  ["/orcamentos", "Orçamentos"],
  ["/pos-venda", "Pós-venda"],
  ["/parceiros", "Parceiros"],
  ["/produtos", "Produtos"],
  ["/clientes", "CRM"],
  ["/estoque", "Estoque e Compras"],
  ["/agenda", "Agenda"],
  ["/leads", "Leads"],
  ["/vendas", "Comercial"],
  ["/physique/atletas", "Atletas"],
  ["/parceiro/seguranca", "Segurança"],
  ["/parceiro", "Portal do parceiro"],
  ["/catalogo/suplementos", "Catálogo de suplementos"],
  ["/catalogo/fitness", "Catálogo Fitness"],
  ["/catalogo", "Vitrine"],
  ["/configuracoes", "Configurações"],
  ["/promocoes", "Promoções"],
];

function startsWithRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function operationFor(pathname: string): Operation {
  if (startsWithRoute(pathname, "/bank")) return "bank";
  if (startsWithRoute(pathname, "/fitness")) return "fitness";
  if (startsWithRoute(pathname, "/catalogo/fitness")) return "fitness";
  if (startsWithRoute(pathname, "/catalogo/suplementos")) return "supplements";
  if (
    startsWithRoute(pathname, "/central") ||
    startsWithRoute(pathname, "/nexus") ||
    startsWithRoute(pathname, "/marketing")
  ) return "central";
  if (startsWithRoute(pathname, "/physique")) return "physique";
  if (startsWithRoute(pathname, "/suplementos") || startsWithRoute(pathname, "/parceiro")) return "supplements";

  const supplementRoots = [
    "/agenda", "/cadastros", "/clientes", "/estoque", "/fornecedores", "/leads",
    "/movimentacoes", "/orcamentos", "/painel-cs", "/parceiros", "/pedidos-fornecedor",
    "/pedidos-pendentes", "/pos-venda", "/produtos", "/trocas", "/vendas",
  ];
  if (supplementRoots.some((route) => startsWithRoute(pathname, route))) return "supplements";
  return "company";
}

function humanize(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).filter((item) => !/^[0-9a-f-]{20,}$/i.test(item)).at(-1) ?? "Início";
  const value = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function labelFor(pathname: string) {
  const match = LABELS.find(([route]) => startsWithRoute(pathname, route));
  return match?.[1] ?? humanize(pathname);
}

function identityFor(pathname: string) {
  if (pathname === "/" || pathname === "/dashboard" || pathname === "/catalogo") return OPERATION.company;
  if (pathname === "/bank") return OPERATION.bank;
  if (pathname === "/fitness") return OPERATION.fitness;
  if (pathname === "/central") return OPERATION.central;
  if (pathname === "/suplementos") return OPERATION.supplements;
  if (pathname === "/physique") return OPERATION.physique;
  const config = OPERATION[operationFor(pathname)];
  return { ...config, brandTitle: `${labelFor(pathname)} - ${config.suffix}` };
}

export function RouteTabIdentity() {
  const pathname = usePathname();
  useEffect(() => {
    const identity = identityFor(pathname || "/");
    document.title = identity.brandTitle;
    const icon = document.getElementById("candinho-route-favicon") as HTMLLinkElement | null;
    if (icon) icon.href = `${identity.icon}?v=${FAVICON_VERSION}`;
  }, [pathname]);
  return null;
}
