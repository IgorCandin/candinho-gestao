import type { UserAccess } from "@/lib/access";

export type NexusCommandOperation =
  | "company"
  | "central"
  | "supplements"
  | "fitness"
  | "bank"
  | "marketing"
  | "physique";

export type NexusCommandRoute = {
  label: string;
  href: string;
  operation: NexusCommandOperation;
  keywords: string;
};

export const NEXUS_COMMAND_ROUTES: NexusCommandRoute[] = [
  {
    label: "Nexus · Meu Dia",
    href: "/nexus/foco",
    operation: "company",
    keywords: "meu dia foco começar agora atalhos rotina nexus",
  },
  {
    label: "Nexus · Fila única",
    href: "/nexus/fila",
    operation: "company",
    keywords: "fila prioridade tudo agora pendencias operações nexus",
  },
  {
    label: "Candinho Company",
    href: "/dashboard",
    operation: "company",
    keywords: "home inicio operações company",
  },
  {
    label: "Central · Prioridades",
    href: "/central/prioridades",
    operation: "central",
    keywords: "central prioridade tarefa pendencia hoje",
  },
  {
    label: "Central · Agenda",
    href: "/central/agenda",
    operation: "central",
    keywords: "agenda calendário tarefa central",
  },
  {
    label: "Central · Rupturas",
    href: "/central/rupturas",
    operation: "central",
    keywords: "ruptura falta estoque demanda central",
  },
  {
    label: "Central · Busca Global",
    href: "/central/busca",
    operation: "central",
    keywords: "buscar pesquisa cliente produto parceiro",
  },
  {
    label: "Suplementos · Hoje",
    href: "/suplementos",
    operation: "supplements",
    keywords: "suplementos home hoje",
  },
  {
    label: "Suplementos · Nova venda",
    href: "/vendas/nova",
    operation: "supplements",
    keywords: "venda orçamento vender nova",
  },
  {
    label: "Suplementos · Pedidos pendentes",
    href: "/pedidos-pendentes",
    operation: "supplements",
    keywords: "pedido entrega pagamento pendente",
  },
  {
    label: "Suplementos · Radar comercial",
    href: "/clientes/radar",
    operation: "supplements",
    keywords: "radar oportunidade recompra cliente venda",
  },
  {
    label: "Suplementos · CRM",
    href: "/clientes",
    operation: "supplements",
    keywords: "cliente crm relacionamento",
  },
  {
    label: "Suplementos · Agenda",
    href: "/agenda",
    operation: "supplements",
    keywords: "agenda retorno tarefa pós venda",
  },
  {
    label: "Suplementos · Pós-venda",
    href: "/pos-venda",
    operation: "supplements",
    keywords: "pos venda retorno acompanhamento",
  },
  {
    label: "Suplementos · Produtos",
    href: "/produtos",
    operation: "supplements",
    keywords: "produto catálogo suplemento",
  },
  {
    label: "Suplementos · Estoque",
    href: "/estoque",
    operation: "supplements",
    keywords: "estoque saldo produto inventario",
  },
  {
    label: "Suplementos · Compras",
    href: "/pedidos-fornecedor/planejamento",
    operation: "supplements",
    keywords: "comprar fornecedor reposição planejar",
  },
  {
    label: "Suplementos · Parceiros",
    href: "/parceiros",
    operation: "supplements",
    keywords: "parceria academia ponto parceiro",
  },
  {
    label: "Suplementos · Nexus IA",
    href: "/suplementos/nexus",
    operation: "supplements",
    keywords: "nexus ia inteligência copiloto perguntar",
  },
  {
    label: "Fitness · Início",
    href: "/fitness",
    operation: "fitness",
    keywords: "fitness home",
  },
  {
    label: "Fitness · Nova venda",
    href: "/fitness/vendas/nova",
    operation: "fitness",
    keywords: "fitness venda nova roupa",
  },
  {
    label: "Fitness · Comercial",
    href: "/fitness/vendas",
    operation: "fitness",
    keywords: "fitness vendas comercial",
  },
  {
    label: "Fitness · Produtos",
    href: "/fitness/produtos",
    operation: "fitness",
    keywords: "fitness produto roupa",
  },
  {
    label: "Fitness · Estoque",
    href: "/fitness/estoque",
    operation: "fitness",
    keywords: "fitness estoque roupa",
  },
  {
    label: "Fitness · Clientes",
    href: "/fitness/clientes",
    operation: "fitness",
    keywords: "fitness clientes crm",
  },
  {
    label: "Bank · Este mês",
    href: "/bank",
    operation: "bank",
    keywords: "bank banco financeiro mês caixa",
  },
  {
    label: "Bank · Atualização rápida",
    href: "/bank/atualizar",
    operation: "bank",
    keywords: "bank atualizar saldo",
  },
  {
    label: "Bank · Entradas e receber",
    href: "/bank/entradas",
    operation: "bank",
    keywords: "bank entrada receber receita",
  },
  {
    label: "Bank · Cobranças",
    href: "/bank/cobrancas",
    operation: "bank",
    keywords: "bank cobrança pagar despesa conta",
  },
  {
    label: "Bank · Faturas",
    href: "/bank/faturas",
    operation: "bank",
    keywords: "bank cartão fatura",
  },
  {
    label: "Bank · Empréstimos",
    href: "/bank/emprestimos",
    operation: "bank",
    keywords: "bank emprestimo dívida notinha parcela",
  },
  {
    label: "Marketing · Visão geral",
    href: "/marketing",
    operation: "marketing",
    keywords: "marketing campanha conteúdo",
  },
  {
    label: "Marketing · Planejamento",
    href: "/central/agenda?scope=marketing",
    operation: "marketing",
    keywords: "marketing agenda planejamento post campanha",
  },
  {
    label: "Physique · Fichas",
    href: "/physique/fichas",
    operation: "physique",
    keywords: "physique treino ficha",
  },
];

function canSeeOperation(
  operation: NexusCommandOperation,
  access: UserAccess,
) {
  if (!access.active) return false;
  if (access.role === "admin") return true;
  if (operation === "company") return access.role !== "partner";
  if (operation === "supplements") return access.canAccessSupplements;
  if (operation === "fitness") return access.canAccessFitness;
  if (operation === "bank") return access.canAccessBank;
  if (operation === "marketing") return access.canAccessMarketing;
  if (operation === "physique") return access.canManageUsers;

  return (
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing
  );
}

export function nexusCommandRoutesForAccess(access: UserAccess) {
  return NEXUS_COMMAND_ROUTES.filter((item) =>
    canSeeOperation(item.operation, access),
  );
}
