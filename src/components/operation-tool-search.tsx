"use client";

import Link from "next/link";
import { Bot, Search, UserRoundPlus } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserAccess } from "@/lib/access";

type OperationKey = "company" | "central" | "supplements" | "fitness" | "bank" | "marketing" | "partner" | "physique";
type ToolItem = { label: string; href: string; operation: OperationKey; keywords: string };

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
  { label: "Central · Agenda", href: "/central/agenda", operation: "central", keywords: "calendário compromissos tarefas" },
  { label: "Central · Agenda Estratégica", href: "/central/agenda-estrategica", operation: "central", keywords: "planejamento estratégico estratégia" },
  { label: "Central · Pendências", href: "/central/pendencias", operation: "central", keywords: "pendente tarefa" },
  { label: "Central · Mídia", href: "/central/midia", operation: "central", keywords: "fotos vídeos arquivos" },
  { label: "Central · Integrações", href: "/central/integracoes", operation: "central", keywords: "whatsapp meta openai integração" },
  { label: "Central · Governança", href: "/central/governanca", operation: "central", keywords: "permissões acessos segurança auditoria" },

  { label: "Suplementos · Hoje", href: "/suplementos", operation: "supplements", keywords: "inicio home operação hoje" },
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
  { label: "Suplementos · Nexus IA", href: "/suplementos/nexus", operation: "supplements", keywords: "ia inteligência recomendação cliente suplemento conversa" },

  { label: "Fitness · Início", href: "/fitness", operation: "fitness", keywords: "fitness home" },
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
  if (tool.operation === "physique") return access.role === "admin" || access.canManageUsers;
  if (tool.operation === "supplements") return access.canAccessSupplements || access.role === "admin";
  if (tool.operation === "fitness") return access.canAccessFitness || access.role === "admin";
  if (tool.operation === "bank") return access.canAccessBank || access.role === "admin";
  if (tool.operation === "marketing") return access.canAccessMarketing || access.role === "admin";
  return access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing;
}

function SearchBox({
  query,
  setQuery,
  results,
  currentOperation,
  access,
  mobile = false,
}: {
  query: string;
  setQuery: (value: string) => void;
  results: ToolItem[];
  currentOperation: OperationKey;
  access: UserAccess;
  mobile?: boolean;
}) {
  const closeMobile = () => {
    setQuery("");
    document.querySelector<HTMLDetailsElement>(".mobile-menu")?.removeAttribute("open");
  };

  const showSupplementShortcuts = currentOperation === "supplements" && access.canWriteSupplements;

  return (
    <div
      style={{
        padding: mobile ? "8px 10px 10px" : "0 0 10px",
        position: "relative",
        zIndex: 6,
      }}
    >
      <label style={{ position: "relative", display: "block" }}>
        <Search
          size={15}
          style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        />
        <input
          aria-label="Buscar ferramenta"
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar ferramenta..."
          style={{ width: "100%", paddingLeft: 34, minHeight: 38 }}
        />
      </label>

      {showSupplementShortcuts && !query && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 7 }}>
          <Link className="button ghost compact-button" href="/leads/novo" onClick={mobile ? closeMobile : undefined}>
            <UserRoundPlus size={14} /> Novo Lead
          </Link>
          <Link className="button ghost compact-button" href="/suplementos/nexus" onClick={mobile ? closeMobile : undefined}>
            <Bot size={14} /> Nexus IA
          </Link>
        </div>
      )}

      {query.trim() && (
        <div
          style={{
            marginTop: 7,
            display: "grid",
            gap: 4,
            maxHeight: mobile ? 260 : 320,
            overflowY: "auto",
            padding: 4,
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "var(--panel)",
          }}
        >
          {results.length === 0 ? (
            <small style={{ padding: 10, color: "var(--muted)" }}>Nenhuma ferramenta encontrada.</small>
          ) : (
            results.map((tool) => (
              <Link
                className="nav-link"
                href={tool.href}
                key={`${tool.operation}-${tool.href}-${tool.label}`}
                onClick={mobile ? closeMobile : () => setQuery("")}
                style={{ minHeight: 36 }}
              >
                <Search size={14} />
                <span className="nav-label" style={{ lineHeight: 1.2 }}>{tool.label}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function OperationToolSearch({ access }: { access: UserAccess }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [desktopHost, setDesktopHost] = useState<HTMLElement | null>(null);
  const [mobileHost, setMobileHost] = useState<HTMLElement | null>(null);
  const currentOperation = operationForPath(pathname);

  const results = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return TOOLS.filter((tool) => canSee(tool, access))
      .map((tool) => ({ tool, score: normalize(`${tool.label} ${tool.keywords} ${tool.operation}`).includes(needle) ? 1 : 0 }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        const aCurrent = a.tool.operation === currentOperation ? 1 : 0;
        const bCurrent = b.tool.operation === currentOperation ? 1 : 0;
        return bCurrent - aCurrent || a.tool.label.localeCompare(b.tool.label, "pt-BR");
      })
      .slice(0, 12)
      .map((entry) => entry.tool);
  }, [access, currentOperation, query]);

  useEffect(() => {
    const desktopNav = document.querySelector<HTMLElement>(".sidebar .nav");
    const mobilePanel = document.querySelector<HTMLElement>(".mobile-menu-panel");
    const desktop = document.createElement("div");
    const mobile = document.createElement("div");
    desktop.dataset.operationToolSearch = "desktop";
    mobile.dataset.operationToolSearch = "mobile";

    if (desktopNav) {
      desktopNav.prepend(desktop);
      setDesktopHost(desktop);
    }
    if (mobilePanel) {
      mobilePanel.prepend(mobile);
      setMobileHost(mobile);
    }

    return () => {
      desktop.remove();
      mobile.remove();
      setDesktopHost(null);
      setMobileHost(null);
    };
  }, []);

  return (
    <>
      {desktopHost && createPortal(
        <SearchBox query={query} setQuery={setQuery} results={results} currentOperation={currentOperation} access={access} />,
        desktopHost,
      )}
      {mobileHost && createPortal(
        <SearchBox query={query} setQuery={setQuery} results={results} currentOperation={currentOperation} access={access} mobile />,
        mobileHost,
      )}
    </>
  );
}
