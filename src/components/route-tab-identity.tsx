"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Operation =
  | "company"
  | "bank"
  | "fitness"
  | "supplements"
  | "central"
  | "marketing"
  | "physique";

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
  marketing: {
    suffix: "Marketing",
    brandTitle: "Candinho Marketing",
    icon: "/favicons/cm-v44.png",
  },
  physique: {
    suffix: "Physique",
    brandTitle: "Candinho Physique",
    // CP ainda não foi fornecido. Até lá, usa a identidade Company
    // em vez de inventar uma sigla/cor.
    icon: "/favicons/cc-v44.png",
  },
} satisfies Record<
  Operation,
  { suffix: string; brandTitle: string; icon: string }
>;

const LABELS: Array<[string, string]> = [
  // Bank
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
  ["/bank/organizar", "Organizar"],
  ["/bank/nexus", "Nexus"],

  // Fitness
  ["/fitness/pedidos/novo", "Novo pedido"],
  ["/fitness/vendas/nova", "Nova venda"],
  ["/fitness/movimentacoes", "Movimentações"],
  ["/fitness/fornecedores", "Fornecedores"],
  ["/fitness/clientes", "Clientes"],
  ["/fitness/produtos", "Produtos"],
  ["/fitness/estoque", "Estoque"],
  ["/fitness/pedidos", "Pedidos"],
  ["/fitness/vendas", "Comercial"],
  ["/fitness/painel", "Painel gerencial"],

  // Central
  ["/central/agenda-estrategica", "Agenda Estratégica"],
  ["/central/prioridades", "Prioridades"],
  ["/central/promocoes", "Promoções"],
  ["/central/rupturas", "Rupturas"],
  ["/central/respostas", "Respostas rápidas"],
  ["/central/integracoes", "Integrações"],
  ["/central/governanca", "Governança"],
  ["/central/pendencias", "Pendências"],
  ["/central/ativacao", "Ativação"],
  ["/central/clientes", "Clientes"],
  ["/central/alertas", "Alertas"],
  ["/central/agenda", "Agenda"],
  ["/central/busca", "Busca Global"],
  ["/central/midia", "Mídia"],

  // Suplementos
  ["/pedidos-fornecedor", "Pedidos de fornecedor"],
  ["/pedidos-pendentes", "Pedidos pendentes"],
  ["/suplementos/painel", "Gestão"],
  ["/movimentacoes", "Movimentações"],
  ["/fornecedores", "Fornecedores"],
  ["/vendas/nova", "Nova venda"],
  ["/orcamentos", "Orçamentos"],
  ["/pos-venda", "Pós-venda"],
  ["/parceiros", "Parceiros"],
  ["/produtos", "Produtos"],
  ["/clientes", "CRM e relacionamento"],
  ["/estoque", "Estoque e compras"],
  ["/agenda", "Agenda"],
  ["/leads", "Leads"],
  ["/vendas", "Comercial"],

  // Physique
  ["/physique/atletas", "Atletas"],

  // Company / apoio
  ["/configuracoes", "Configurações"],
  ["/promocoes", "Promoções"],
  ["/parceiro/seguranca", "Segurança do parceiro"],
  ["/parceiro", "Portal do parceiro"],
  ["/login", "Entrar"],
];

function startsWithRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function operationFor(
  pathname: string,
  marketingScope: boolean,
): Operation {
  if (startsWithRoute(pathname, "/catalogo/fitness")) return "fitness";
  if (startsWithRoute(pathname, "/catalogo/suplementos")) {
    return "supplements";
  }

  if (marketingScope && startsWithRoute(pathname, "/central")) {
    return "marketing";
  }

  if (startsWithRoute(pathname, "/bank")) return "bank";
  if (startsWithRoute(pathname, "/fitness")) return "fitness";
  if (startsWithRoute(pathname, "/marketing")) return "marketing";
  if (startsWithRoute(pathname, "/central")) return "central";
  if (startsWithRoute(pathname, "/physique")) return "physique";
  if (startsWithRoute(pathname, "/suplementos")) return "supplements";

  if (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/catalogo" ||
    startsWithRoute(pathname, "/configuracoes") ||
    startsWithRoute(pathname, "/promocoes") ||
    startsWithRoute(pathname, "/parceiro") ||
    startsWithRoute(pathname, "/login")
  ) {
    return "company";
  }

  // Segue a mesma filosofia do AppShell:
  // rotas operacionais raiz como /agenda, /clientes, /vendas,
  // /produtos etc. pertencem à Suplementos.
  return "supplements";
}

function humanizeSegment(pathname: string) {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => !/^[0-9a-f-]{20,}$/i.test(segment));

  const segment = segments.at(-1) ?? "";

  if (!segment) return "Início";

  const text = decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .trim();

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function labelFor(
  pathname: string,
  operation: Operation,
  marketingScope: boolean,
) {
  if (marketingScope) {
    if (startsWithRoute(pathname, "/central/midia")) {
      return "Ideias e arquivos";
    }

    if (startsWithRoute(pathname, "/central/agenda")) {
      return "Planejamento";
    }
  }

  const match = LABELS.find(([route]) =>
    startsWithRoute(pathname, route),
  );

  if (match) return match[1];

  if (operation === "marketing" && pathname !== "/marketing") {
    return humanizeSegment(pathname);
  }

  return humanizeSegment(pathname);
}

function resolveIdentity(
  pathname: string,
  marketingScope: boolean,
) {
  if (pathname === "/" || pathname === "/dashboard") {
    return OPERATION.company;
  }

  if (pathname === "/bank") return OPERATION.bank;
  if (pathname === "/fitness") return OPERATION.fitness;
  if (pathname === "/suplementos") return OPERATION.supplements;
  if (pathname === "/marketing") return OPERATION.marketing;
  if (pathname === "/central") return OPERATION.central;
  if (pathname === "/physique") return OPERATION.physique;

  if (startsWithRoute(pathname, "/catalogo/fitness")) {
    return {
      ...OPERATION.fitness,
      brandTitle: "Catálogo · Candinho Fitness",
    };
  }

  if (startsWithRoute(pathname, "/catalogo/suplementos")) {
    return {
      ...OPERATION.supplements,
      brandTitle: "Catálogo · Candinho Suplementos",
    };
  }

  if (pathname === "/catalogo") {
    return {
      ...OPERATION.company,
      brandTitle: "Catálogo · Candinho Company",
    };
  }

  const operation = operationFor(pathname, marketingScope);
  const config = OPERATION[operation];
  const label = labelFor(pathname, operation, marketingScope);

  return {
    ...config,
    brandTitle: `${label} - ${config.suffix}`,
  };
}

function setFavicon(href: string) {
  const versionedHref = `${href}?v=44`;
  const icons = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"]',
    ),
  );

  if (icons.length === 0) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    icon.href = versionedHref;
    icon.dataset.candinhoRouteFavicon = "true";
    document.head.appendChild(icon);
    return;
  }

  icons.forEach((icon) => {
    icon.type = "image/png";
    icon.href = versionedHref;
    icon.dataset.candinhoRouteFavicon = "true";
  });
}

export function RouteTabIdentity() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const marketingScope =
      searchParams.get("scope") === "marketing";

    const identity = resolveIdentity(
      pathname || "/",
      marketingScope,
    );

    const applyIdentity = () => {
      document.title = identity.brandTitle;
      setFavicon(identity.icon);
    };

    applyIdentity();

    // Next pode atualizar o <head> logo depois da navegação/hidratação.
    // Reaplicamos uma vez no próximo frame e outra após um curto atraso.
    const frame = window.requestAnimationFrame(applyIdentity);
    const timer = window.setTimeout(applyIdentity, 180);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname, searchParams]);

  return null;
}
