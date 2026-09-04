"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Bug,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ContactRound,
  Handshake,
  Home,
  LogOut,
  Maximize2,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserAccess } from "@/lib/access";
import { BRAND_ASSETS } from "@/lib/brand-assets";

type RouteItem = {
  label: string;
  note: string;
  href: string;
  keywords: string;
  icon: LucideIcon;
  kind?: "report";
};

type CustomerItem = {
  id: string;
  name: string;
  detail: string;
  href: string;
  operation: "Suplementos" | "Fitness";
  kind?: "customer" | "product";
};

const PRIMARY_NAV: RouteItem[] = [
  { label: "Vender agora", note: "Recompras, leads e oportunidades", href: "/company/vender", keywords: "vendas comercial leads recompra", icon: ShoppingBag },
  { label: "Concluir vendas", note: "Recebimentos, entregas e pendências", href: "/company/concluir", keywords: "caixa receber cobrança dinheiro entregar retirada logística", icon: CircleDollarSign },
  { label: "Atender e acompanhar", note: "Pós-venda e retornos", href: "/company/acompanhar", keywords: "atender acompanhar pos venda retorno", icon: ContactRound },
  { label: "Produtos", note: "Disponibilidade, preços e catálogo", href: "/company/produtos", keywords: "produto estoque preço catálogo", icon: PackageSearch },
  { label: "Comprar e repor", note: "Estoque, rupturas e pedidos", href: "/company/compras", keywords: "comprar repor estoque fornecedor", icon: Boxes },
  { label: "Organizar o dia", note: "Agenda, tarefas e prioridades", href: "/company/dia", keywords: "agenda meu dia calendário tarefa", icon: CalendarDays },
];

const SEARCH_ROUTES: RouteItem[] = [
  ...PRIMARY_NAV,
  { label: "Início da Company", note: "Voltar ao radar de execução", href: "/company/inicio", keywords: "inicio home company", icon: Home },
  { label: "Agenda geral", note: "Compromissos de todas as operações", href: "/central/agenda", keywords: "agenda calendário compromisso", icon: CalendarDays },
  { label: "CRM · Suplementos", note: "Clientes e histórico de compras", href: "/clientes", keywords: "crm cliente suplementos", icon: ContactRound },
  { label: "CRM · Fitness", note: "Clientes e histórico Fitness", href: "/fitness/clientes", keywords: "crm cliente fitness", icon: ContactRound },
  { label: "Parcerias", note: "Relacionamentos e parceiros", href: "/clientes/relacionamentos", keywords: "parceria parceiros relacionamento", icon: Handshake },
  { label: "Produtos · Suplementos", note: "Cadastro e catálogo", href: "/produtos", keywords: "produto suplemento catálogo", icon: PackageSearch },
  { label: "Produtos · Fitness", note: "Cadastro e catálogo", href: "/fitness/produtos", keywords: "produto fitness roupa catálogo", icon: PackageSearch },
  { label: "Meu Dia", note: "Rotinas e prioridades do negócio", href: "/central/meu-dia", keywords: "ferramenta meu dia rotina prioridade", icon: Sparkles },
  { label: "Qualidade", note: "Saúde e consistência do ERP", href: "/nexus/qualidade", keywords: "ferramenta qualidade erro sistema", icon: ShieldCheck },
  { label: "Relatar problema", note: "Registrar uma quebra para revisão", href: "#relatar-problema", keywords: "ferramenta relatar problema bug erro", icon: Bug, kind: "report" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function openIssueReporter() {
  document.querySelector<HTMLButtonElement>('button[aria-label="Registrar quebra na UX ou função"]')?.click();
}

export function CompanyShellV2({ children, access }: { children: React.ReactNode; access: UserAccess }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const needle = normalize(query.trim());
  const canSearchCustomers = query.trim().length >= 2;
  const visibleCustomers = canSearchCustomers ? customers : [];
  const customerResults = visibleCustomers.filter((item) => item.kind !== "product");
  const productResults = visibleCustomers.filter((item) => item.kind === "product");
  const visibleLoading = canSearchCustomers && loading;

  const routes = useMemo(() => {
    if (!needle) return [];
    return SEARCH_ROUTES.filter((item) => normalize(`${item.label} ${item.note} ${item.keywords}`).includes(needle)).slice(0, 7);
  }, [needle]);

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/company/search?q=${encodeURIComponent(query.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: CustomerItem[] };
        if (!controller.signal.aborted) setCustomers(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        if (!controller.signal.aborted) setCustomers([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  function finishSearch() {
    setQuery("");
    searchRef.current?.blur();
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  return (
    <div className="company-shell-v2">
      <header className="company-command-header">
        <button className="company-fullscreen-button company-header-edge-control" type="button" onClick={() => void toggleFullscreen()} aria-label="Alternar tela cheia" title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"} aria-pressed={isFullscreen}>
          <Maximize2 size={17}/>
        </button>
        <div className="company-header-inner">
          <nav className="company-primary-nav" aria-label="Setores da Company">
            {PRIMARY_NAV.slice(0, 3).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname.startsWith(href) ? "active" : ""} aria-label={label} title={label}>
                <Icon size={19} /><span>{label}</span>
              </Link>
            ))}
          </nav>

          <Link className="company-header-brand" href="/company/inicio" aria-label="Início da Candinho Company">
            <Image src={BRAND_ASSETS.company.complete.src} alt={BRAND_ASSETS.company.complete.alt} width={190} height={63} priority />
          </Link>

          <nav className="company-primary-nav company-primary-nav-right" aria-label="Operação e organização">
            {PRIMARY_NAV.slice(3).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname.startsWith(href) ? "active" : ""} aria-label={label} title={label}>
                <Icon size={19} /><span>{label}</span>
              </Link>
            ))}
          </nav>

          <details className="company-account-menu">
            <summary aria-label="Abrir opções da conta"><UserRound size={18} /><ChevronDown size={13} /></summary>
            <div>
              <strong>{access.name}</strong>
              <small>{access.email ?? "Acesso Company"}</small>
              <Link href="/dashboard"><Home size={15} /> ERP 1.0</Link>
              <form action="/auth/signout" method="post"><button type="submit"><LogOut size={15} /> Sair</button></form>
            </div>
          </details>
        </div>
      </header>

      <main className="company-shell-content">{children}</main>

      <div className="company-global-search" role="search">
        {(needle || visibleLoading) && (
          <div className="company-search-results" aria-live="polite">
            {customerResults.length > 0 && <p>Clientes</p>}
            {customerResults.map((customer) => (
              <Link href={customer.href} key={`${customer.operation}-${customer.id}`} onClick={finishSearch}>
                <span className="company-result-icon"><UserRound size={17} /></span>
                <span><strong>{customer.name}</strong><small>{customer.operation} · {customer.detail}</small></span>
              </Link>
            ))}
            {productResults.length > 0 && <p>Produtos</p>}
            {productResults.map((product) => (
              <Link href={product.href} key={`${product.operation}-${product.id}`} onClick={finishSearch}>
                <span className="company-result-icon"><PackageSearch size={17} /></span>
                <span><strong>{product.name}</strong><small>{product.operation} · {product.detail}</small></span>
              </Link>
            ))}
            {routes.length > 0 && <p>Páginas e ferramentas</p>}
            {routes.map(({ href, label, note, icon: Icon, kind }) => kind === "report" ? (
              <button key={href} type="button" onClick={() => { finishSearch(); openIssueReporter(); }}>
                <span className="company-result-icon"><Icon size={17} /></span><span><strong>{label}</strong><small>{note}</small></span>
              </button>
            ) : (
              <Link href={href} key={href} onClick={finishSearch}>
                <span className="company-result-icon"><Icon size={17} /></span><span><strong>{label}</strong><small>{note}</small></span>
              </Link>
            ))}
            {visibleLoading && <span className="company-search-status">Procurando clientes e produtos…</span>}
            {!visibleLoading && visibleCustomers.length === 0 && routes.length === 0 && <span className="company-search-status">Nada encontrado. Tente um nome, setor ou tarefa.</span>}
          </div>
        )}
        <Search size={20} />
        <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque o que necessita" aria-label="Busca geral da Candinho Company" />
        <kbd>Ctrl K</kbd>
      </div>
    </div>
  );
}
