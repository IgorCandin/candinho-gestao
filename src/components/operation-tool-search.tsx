"use client";

import Link from "next/link";
import {
  Bot,
  CalendarDays,
  PackageSearch,
  Search,
  UserRoundPlus,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserAccess } from "@/lib/access";

type OperationKey =
  | "company"
  | "central"
  | "supplements"
  | "fitness"
  | "bank"
  | "marketing"
  | "partner"
  | "physique";

type ToolItem = {
  label: string;
  href: string;
  operation: OperationKey;
  keywords: string;
};

type ProductSearchItem = {
  operation: "supplements" | "fitness";
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  available_quantity: number;
  href: string;
  subtitle: string | null;
};

const TOOLS: ToolItem[] = [
  { label: "Início da Company", href: "/dashboard", operation: "company", keywords: "hub operações início company" },

  { label: "Central · Visão Geral", href: "/central", operation: "central", keywords: "central inicio visão geral" },
  { label: "Central · Prioridades", href: "/central/prioridades", operation: "central", keywords: "tarefas prioridade fila hoje" },
  { label: "Central · Promoções", href: "/central/promocoes", operation: "central", keywords: "campanha promoção marketing desconto" },
  { label: "Central · Rupturas", href: "/central/rupturas", operation: "central", keywords: "falta estoque demanda ruptura" },
  { label: "Central · Busca Global", href: "/central/busca", operation: "central", keywords: "pesquisar buscar cliente produto parceiro mídia" },
  { label: "Central · Alertas", href: "/central/alertas", operation: "central", keywords: "alerta atenção erro" },
  { label: "Central · Respostas rápidas", href: "/central/respostas", operation: "central", keywords: "mensagem pronta resposta whatsapp" },
  { label: "Central · Clientes", href: "/central/clientes", operation: "central", keywords: "contatos unificados cliente" },
  { label: "Central · Agenda", href: "/central/agenda", operation: "central", keywords: "agenda calendário compromissos tarefas" },
  { label: "Central · Agenda Estratégica", href: "/central/agenda-estrategica", operation: "central", keywords: "agenda planejamento estratégico estratégia" },
  { label: "Central · Pendências", href: "/central/pendencias", operation: "central", keywords: "pendente tarefa" },
  { label: "Central · Mídia", href: "/central/midia", operation: "central", keywords: "fotos vídeos arquivos" },
  { label: "Central · Integrações", href: "/central/integracoes", operation: "central", keywords: "whatsapp meta openai integração" },
  { label: "Central · Governança", href: "/central/governanca", operation: "central", keywords: "permissões acessos segurança auditoria" },

  { label: "Suplementos · Hoje", href: "/suplementos", operation: "supplements", keywords: "inicio home operação hoje" },
  { label: "Suplementos · Nexus IA", href: "/suplementos/nexus", operation: "supplements", keywords: "nexus ia inteligência recomendação cliente suplemento conversa" },
  { label: "Suplementos · Agenda", href: "/agenda", operation: "supplements", keywords: "agenda calendário compromissos pós venda retorno tarefas hoje" },
  { label: "Suplementos · Novo Lead", href: "/leads/novo", operation: "supplements", keywords: "adicionar lead perguntou interesse cliente" },
  { label: "Suplementos · Novo Orçamento", href: "/vendas/nova", operation: "supplements", keywords: "orçamento venda nova venda cotação" },
  { label: "Suplementos · Leads", href: "/leads", operation: "supplements", keywords: "interesses contatos" },
  { label: "Suplementos · Orçamentos", href: "/orcamentos", operation: "supplements", keywords: "cotação propostas" },
  { label: "Suplementos · Pedidos pendentes", href: "/pedidos-pendentes", operation: "supplements", keywords: "venda pagamento entrega pedido" },
  { label: "Suplementos · Pós-venda", href: "/pos-venda", operation: "supplements", keywords: "retorno acompanhamento nexus mensagem" },
  { label: "Suplementos · CRM", href: "/clientes", operation: "supplements", keywords: "clientes relacionamento histórico" },
  { label: "Suplementos · Radar", href: "/clientes/radar", operation: "supplements", keywords: "oportunidade recompra reativação" },
  { label: "Suplementos · Estoque", href: "/estoque", operation: "supplements", keywords: "saldo inventário produto" },
  { label: "Suplementos · Movimentações", href: "/movimentacoes", operation: "supplements", keywords: "entrada saída ajuste histórico estoque" },
  { label: "Suplementos · Planejar compras", href: "/pedidos-fornecedor/planejamento", operation: "supplements", keywords: "compras fornecedor reposição pedido" },
  { label: "Suplementos · Fornecedores", href: "/fornecedores", operation: "supplements", keywords: "fornecedor compras preço" },
  { label: "Suplementos · Produtos", href: "/produtos", operation: "supplements", keywords: "catálogo cadastro sabores" },
  { label: "Suplementos · Parceiros", href: "/parceiros", operation: "supplements", keywords: "parceria portal ponto retirada patrocínio" },
  { label: "Suplementos · Gestão", href: "/suplementos/painel", operation: "supplements", keywords: "painel gerencial faturamento lucro indicadores" },

  { label: "Fitness · Início", href: "/fitness", operation: "fitness", keywords: "fitness home" },
  { label: "Fitness · Nexus", href: "/fitness/nexus", operation: "fitness", keywords: "nexus inteligência estoque promoção campanha giro sugestão" },
  { label: "Fitness · Painel Gerencial", href: "/fitness/painel", operation: "fitness", keywords: "gestão indicadores" },
  { label: "Fitness · Comercial", href: "/fitness/vendas", operation: "fitness", keywords: "vendas comercial" },
  { label: "Fitness · Nova venda", href: "/fitness/vendas/nova", operation: "fitness", keywords: "vender roupa pedido" },
  { label: "Fitness · Produtos", href: "/fitness/produtos", operation: "fitness", keywords: "roupas catálogo" },
  { label: "Fitness · Estoque", href: "/fitness/estoque", operation: "fitness", keywords: "saldo inventário" },
  { label: "Fitness · Clientes", href: "/fitness/clientes", operation: "fitness", keywords: "crm clientes" },
  { label: "Fitness · Pedidos", href: "/fitness/pedidos", operation: "fitness", keywords: "pedido encomenda" },
  { label: "Fitness · Fornecedores", href: "/fitness/fornecedores", operation: "fitness", keywords: "fornecedor" },
  { label: "Fitness · Movimentações", href: "/fitness/movimentacoes", operation: "fitness", keywords: "estoque entrada saída" },

  { label: "Bank · Este mês", href: "/bank", operation: "bank", keywords: "banco financeiro mês caixa" },
  { label: "Bank · Atualização Rápida", href: "/bank/atualizar", operation: "bank", keywords: "saldo atualizar" },
  { label: "Bank · Entradas e receber", href: "/bank/entradas", operation: "bank", keywords: "receita entrada receber" },
  { label: "Bank · Cobranças", href: "/bank/cobrancas", operation: "bank", keywords: "contas pagar cobrança despesa" },
  { label: "Bank · Faturas", href: "/bank/faturas", operation: "bank", keywords: "cartão fatura" },
  { label: "Bank · Empréstimos", href: "/bank/emprestimos", operation: "bank", keywords: "dívida empréstimo notinha" },
  { label: "Bank · Planos e mensalidades", href: "/bank/mensalidades", operation: "bank", keywords: "assinatura mensal" },
  { label: "Bank · Contas e carteiras", href: "/bank/contas", operation: "bank", keywords: "conta saldo carteira" },
  { label: "Bank · Visão anual", href: "/bank/visao-anual", operation: "bank", keywords: "ano projeção" },

  { label: "Marketing · Visão geral", href: "/marketing", operation: "marketing", keywords: "marketing início" },
  { label: "Marketing · Ideias e arquivos", href: "/central/midia?scope=marketing", operation: "marketing", keywords: "mídia criativo foto vídeo" },
  { label: "Marketing · Planejamento", href: "/central/agenda?scope=marketing", operation: "marketing", keywords: "agenda conteúdo campanha" },

  { label: "Portal do Parceiro · Meu Painel", href: "/parceiro", operation: "partner", keywords: "parceiro portal painel" },
  { label: "Portal do Parceiro · Segurança", href: "/parceiro/seguranca", operation: "partner", keywords: "senha acesso segurança" },

  { label: "Physique · Atletas", href: "/physique/atletas", operation: "physique", keywords: "atleta avaliação evolução patrocínio" },
  { label: "Physique · Fichas de treino", href: "/physique/fichas", operation: "physique", keywords: "treino ficha pdf" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function operationForPath(pathname: string): OperationKey {
  if (pathname.startsWith("/central")) return "central";
  if (pathname === "/parceiro" || pathname.startsWith("/parceiro/")) return "partner";
  if (pathname.startsWith("/fitness")) return "fitness";
  if (pathname.startsWith("/bank")) return "bank";
  if (pathname.startsWith("/marketing")) return "marketing";
  if (pathname.startsWith("/physique")) return "physique";
  if (pathname === "/dashboard") return "company";
  return "supplements";
}

function canSee(tool: ToolItem, access: UserAccess) {
  if (tool.operation === "company") return true;
  if (tool.operation === "partner") return access.role === "partner";
  if (tool.operation === "physique") {
    return access.role === "admin" || access.canManageUsers;
  }
  if (tool.operation === "supplements") {
    return access.canAccessSupplements || access.role === "admin";
  }
  if (tool.operation === "fitness") {
    return access.canAccessFitness || access.role === "admin";
  }
  if (tool.operation === "bank") {
    return access.canAccessBank || access.role === "admin";
  }
  if (tool.operation === "marketing") {
    return access.canAccessMarketing || access.role === "admin";
  }

  return (
    access.role === "admin" ||
    access.canAccessSupplements ||
    access.canAccessFitness ||
    access.canAccessMarketing
  );
}

function SearchBox({
  query,
  setQuery,
  tools,
  products,
  loadingProducts,
  mobile = false,
}: {
  query: string;
  setQuery: (value: string) => void;
  tools: ToolItem[];
  products: ProductSearchItem[];
  loadingProducts: boolean;
  mobile?: boolean;
}) {
  const closeMobile = () => {
    setQuery("");
    document
      .querySelector<HTMLDetailsElement>(".mobile-menu")
      ?.removeAttribute("open");
  };

  const onNavigate = mobile ? closeMobile : () => setQuery("");

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: mobile ? "8px 10px 10px" : "0 6px 10px 0",
        position: "relative",
        zIndex: 6,
      }}
    >
      <label style={{ position: "relative", display: "block", width: "100%" }}>
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />

        <input
          aria-label="Buscar ferramenta ou produto"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ferramenta ou produto..."
          style={{
            display: "block",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            paddingLeft: 34,
            minHeight: 38,
          }}
        />
      </label>

      {query.trim() && (
        <div
          style={{
            marginTop: 7,
            display: "grid",
            gap: 6,
            maxHeight: mobile ? 330 : 390,
            overflowY: "auto",
            overflowX: "hidden",
            padding: 5,
            boxSizing: "border-box",
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "var(--panel)",
          }}
        >
          {products.length > 0 && (
            <div style={{ display: "grid", gap: 3 }}>
              <small
                style={{
                  padding: "4px 7px 2px",
                  color: "var(--muted)",
                  fontSize: 7,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Produtos
              </small>

              {products.map((product) => (
                <Link
                  className="nav-link"
                  href={product.href}
                  key={`${product.operation}-${product.id}`}
                  onClick={onNavigate}
                  style={{
                    minHeight: 42,
                    alignItems: "center",
                    border:
                      product.available_quantity > 0
                        ? "1px solid rgba(67,202,120,.13)"
                        : undefined,
                    background:
                      product.available_quantity > 0
                        ? "rgba(67,202,120,.025)"
                        : undefined,
                  }}
                >
                  <PackageSearch
                    size={15}
                    style={{
                      color:
                        product.available_quantity > 0
                          ? "#67d69a"
                          : undefined,
                    }}
                  />

                  <span
                    className="nav-label"
                    style={{
                      lineHeight: 1.2,
                      minWidth: 0,
                      display: "grid",
                      gap: 2,
                    }}
                  >
                    <strong style={{ fontSize: 9 }}>{product.name}</strong>
                    <small
                      style={{
                        color: "var(--muted)",
                        fontSize: 7,
                        whiteSpace: "normal",
                      }}
                    >
                      {product.subtitle ?? product.category ?? "Produto"}
                      {product.available_quantity > 0
                        ? ` · ${product.available_quantity} disponível(is)`
                        : " · sem estoque"}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {tools.length > 0 && (
            <div style={{ display: "grid", gap: 3 }}>
              <small
                style={{
                  padding: "4px 7px 2px",
                  color: "var(--muted)",
                  fontSize: 7,
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Ferramentas
              </small>

              {tools.map((tool) => (
                <Link
                  className="nav-link"
                  href={tool.href}
                  key={`${tool.operation}-${tool.href}-${tool.label}`}
                  onClick={onNavigate}
                  style={{ minHeight: 36 }}
                >
                  <Search size={14} />
                  <span className="nav-label" style={{ lineHeight: 1.2 }}>
                    {tool.label}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {loadingProducts && query.trim().length >= 2 && (
            <small style={{ padding: 8, color: "var(--muted)" }}>
              Procurando produtos...
            </small>
          )}

          {!loadingProducts && products.length === 0 && tools.length === 0 && (
            <small style={{ padding: 10, color: "var(--muted)" }}>
              Nada encontrado.
            </small>
          )}
        </div>
      )}
    </div>
  );
}

function OperationExtraLinks({
  pathname,
  operation,
  mobile = false,
}: {
  pathname: string;
  operation: "supplements" | "fitness";
  mobile?: boolean;
}) {
  const items =
    operation === "fitness"
      ? [
          { href: "/fitness/nexus", label: "Nexus Fitness", icon: Bot },
        ]
      : [
          { href: "/suplementos/nexus", label: "Nexus IA", icon: Bot },
          { href: "/agenda", label: "Agenda", icon: CalendarDays },
        ];

  return (
    <>
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={
            mobile
              ? `mobile-menu-link ${pathname === href ? "primary" : ""}`
              : `nav-link ${pathname === href ? "primary" : ""}`
          }
          onClick={
            mobile
              ? () =>
                  document
                    .querySelector<HTMLDetailsElement>(".mobile-menu")
                    ?.removeAttribute("open")
              : undefined
          }
        >
          <Icon size={18} />
          <span className="nav-label">{label}</span>
        </Link>
      ))}
    </>
  );
}

export function OperationToolSearch({ access }: { access: UserAccess }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [desktopSearchHost, setDesktopSearchHost] =
    useState<HTMLElement | null>(null);
  const [mobileSearchHost, setMobileSearchHost] =
    useState<HTMLElement | null>(null);
  const [desktopExtraHost, setDesktopExtraHost] =
    useState<HTMLElement | null>(null);
  const [mobileExtraHost, setMobileExtraHost] =
    useState<HTMLElement | null>(null);
  const [leadHost, setLeadHost] = useState<HTMLElement | null>(null);

  const currentOperation = operationForPath(pathname);

  const tools = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];

    return TOOLS.filter((tool) => canSee(tool, access))
      .map((tool) => ({
        tool,
        score: normalize(
          `${tool.label} ${tool.keywords} ${tool.operation}`,
        ).includes(needle)
          ? 1
          : 0,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        const aCurrent = a.tool.operation === currentOperation ? 1 : 0;
        const bCurrent = b.tool.operation === currentOperation ? 1 : 0;

        return (
          bCurrent - aCurrent ||
          a.tool.label.localeCompare(b.tool.label, "pt-BR")
        );
      })
      .slice(0, 9)
      .map((entry) => entry.tool);
  }, [access, currentOperation, query]);

  useEffect(() => {
    const value = query.trim();

    if (value.length < 2) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoadingProducts(true);

      try {
        const response = await fetch(
          `/api/operation-search/products?q=${encodeURIComponent(value)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json()) as {
          results?: ProductSearchItem[];
        };

        if (!controller.signal.aborted) {
          const rows = Array.isArray(payload.results) ? payload.results : [];

          rows.sort((a, b) => {
            const aCurrent = a.operation === currentOperation ? 1 : 0;
            const bCurrent = b.operation === currentOperation ? 1 : 0;
            const aStock = a.available_quantity > 0 ? 1 : 0;
            const bStock = b.available_quantity > 0 ? 1 : 0;

            return (
              bCurrent - aCurrent ||
              bStock - aStock ||
              a.name.localeCompare(b.name, "pt-BR")
            );
          });

          setProducts(rows.slice(0, 10));
        }
      } catch {
        if (!controller.signal.aborted) setProducts([]);
      } finally {
        if (!controller.signal.aborted) setLoadingProducts(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentOperation, query]);

  useEffect(() => {
    const desktopNav = document.querySelector<HTMLElement>(".sidebar .nav");
    const mobilePanel = document.querySelector<HTMLElement>(".mobile-menu-panel");
    const topbarActions = document.querySelector<HTMLElement>(".topbar-actions");

    const desktopSearch = document.createElement("div");
    const mobileSearch = document.createElement("div");
    const desktopExtras = document.createElement("div");
    const mobileExtras = document.createElement("div");
    const lead = document.createElement("span");

    desktopSearch.dataset.operationToolSearch = "desktop";
    mobileSearch.dataset.operationToolSearch = "mobile";
    desktopExtras.dataset.operationExtraNav = "desktop";
    mobileExtras.dataset.operationExtraNav = "mobile";
    lead.dataset.operationLeadShortcut = "desktop";

    if (desktopNav) {
      desktopNav.prepend(desktopSearch);
      setDesktopSearchHost(desktopSearch);

      if (currentOperation === "supplements" || currentOperation === "fitness") {
        const firstNavLink =
          desktopNav.querySelector<HTMLElement>(":scope > a.nav-link");

        if (firstNavLink) {
          firstNavLink.after(desktopExtras);
          setDesktopExtraHost(desktopExtras);
        }

        if (currentOperation === "supplements" && pathname === "/agenda") {
          const crmLink = desktopNav.querySelector<HTMLElement>(
            'a.nav-link[href="/clientes"]',
          );
          crmLink?.classList.remove("primary");
        }
      }
    }

    if (mobilePanel) {
      mobilePanel.prepend(mobileSearch);
      setMobileSearchHost(mobileSearch);

      if (currentOperation === "supplements" || currentOperation === "fitness") {
        const firstMobileLink =
          mobilePanel.querySelector<HTMLElement>(":scope > a.mobile-menu-link");

        if (firstMobileLink) {
          firstMobileLink.after(mobileExtras);
          setMobileExtraHost(mobileExtras);
        }
      }
    }

    if (
      currentOperation === "supplements" &&
      access.canWriteSupplements &&
      topbarActions
    ) {
      topbarActions.prepend(lead);
      setLeadHost(lead);
    }

    return () => {
      desktopSearch.remove();
      mobileSearch.remove();
      desktopExtras.remove();
      mobileExtras.remove();
      lead.remove();
      setDesktopSearchHost(null);
      setMobileSearchHost(null);
      setDesktopExtraHost(null);
      setMobileExtraHost(null);
      setLeadHost(null);
    };
  }, [pathname, currentOperation, access.canWriteSupplements]);

  const extraOperation =
    currentOperation === "fitness"
      ? "fitness"
      : currentOperation === "supplements"
        ? "supplements"
        : null;

  return (
    <>
      {desktopSearchHost &&
        createPortal(
          <SearchBox
            query={query}
            setQuery={setQuery}
            tools={tools}
            products={products}
            loadingProducts={loadingProducts}
          />,
          desktopSearchHost,
        )}

      {mobileSearchHost &&
        createPortal(
          <SearchBox
            query={query}
            setQuery={setQuery}
            tools={tools}
            products={products}
            loadingProducts={loadingProducts}
            mobile
          />,
          mobileSearchHost,
        )}

      {desktopExtraHost &&
        extraOperation &&
        createPortal(
          <OperationExtraLinks
            pathname={pathname}
            operation={extraOperation}
          />,
          desktopExtraHost,
        )}

      {mobileExtraHost &&
        extraOperation &&
        createPortal(
          <OperationExtraLinks
            pathname={pathname}
            operation={extraOperation}
            mobile
          />,
          mobileExtraHost,
        )}

      {leadHost &&
        createPortal(
          <Link className="button ghost" href="/leads/novo">
            <UserRoundPlus size={16} />
            Novo Lead
          </Link>,
          leadHost,
        )}
    </>
  );
}
