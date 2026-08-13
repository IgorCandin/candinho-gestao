"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ContactRound,
  FileText,
  Handshake,
  History,
  Home,
  Landmark,
  Lightbulb,
  ListChecks,
  PackageOpen,
  PackageSearch,
  RefreshCcw,
  Search,
  ShoppingBag,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { BRAND_ASSETS } from "@/lib/brand-assets";

type GatewayOperation =
  | "supplements"
  | "fitness"
  | "vitrine"
  | "physique"
  | "bank"
  | "central";

const CONFIG = {
  supplements: {
    label: "Candinho Suplementos",
    slogan: "Qualidade que entrega resultado.",
    brand: BRAND_ASSETS.supplements.complete,
    rgb: "217, 164, 65",
    items: [
      { href: "/suplementos/hoje", label: "Hoje", note: "Rotina da operação", icon: Home },
      { href: "/vendas", label: "Comercial", note: "Vendas e orçamentos", icon: ShoppingBag },
      { href: "/clientes", label: "CRM", note: "Clientes e pós-venda", icon: ContactRound },
      { href: "/agenda", label: "Agenda", note: "Compromissos de Suplementos", icon: CalendarDays },
      { href: "/estoque", label: "Estoque e compras", note: "Saldo, giro e reposição", icon: Boxes },
      { href: "/produtos", label: "Produtos", note: "Catálogo e cadastro", icon: PackageSearch },
      { href: "/parceiros", label: "Parcerias", note: "Rede, acertos e portal", icon: Handshake },
      { href: "/suplementos/painel", label: "Gestão", note: "Indicadores gerenciais", icon: BarChart3 },
    ],
  },
  fitness: {
    label: "Candinho Fitness",
    slogan: "Produto, venda e operação em movimento.",
    brand: BRAND_ASSETS.fitness.complete,
    rgb: "239, 75, 154",
    items: [
      { href: "/fitness", label: "Visão geral", note: "Resumo da operação", icon: Home },
      { href: "/fitness/agenda", label: "Agenda", note: "Compromissos da Fitness", icon: CalendarDays },
      { href: "/fitness/vendas", label: "Comercial", note: "Vendas e recebimentos", icon: ShoppingBag },
      { href: "/fitness/produtos", label: "Produtos", note: "Peças e variações", icon: PackageSearch },
      { href: "/fitness/estoque", label: "Estoque", note: "Saldo e disponibilidade", icon: Boxes },
      { href: "/fitness/clientes", label: "Clientes", note: "Relacionamento Fitness", icon: UsersRound },
      { href: "/fitness/pedidos", label: "Pedidos", note: "Compras e recebimentos", icon: PackageOpen },
    ],
  },
  vitrine: {
    label: "Candinho Vitrine",
    slogan: "Catálogo, produto e experiência em um só lugar.",
    brand: BRAND_ASSETS.company.complete,
    rgb: "255, 126, 73",
    items: [
      { href: "/vitrine", label: "Visão geral", note: "Organize a experiência da vitrine", icon: Home },
      { href: "/catalogo", label: "Abrir vitrine pública", note: "Veja o catálogo como o cliente", icon: ShoppingBag },
      { href: "/produtos", label: "Suplementos", note: "Produtos, preços e imagens", icon: PackageSearch },
      { href: "/fitness/produtos", label: "Fitness", note: "Peças, tamanhos e cores", icon: PackageOpen },
      { href: "/central/promocoes", label: "Promoções", note: "Campanhas que alimentam a vitrine", icon: BarChart3 },
    ],
  },
  physique: {
    label: "Candinho Physique",
    slogan: "Evolução física, histórico e acompanhamento.",
    brand: BRAND_ASSETS.physique.complete,
    rgb: "209, 119, 70",
    items: [
      { href: "/physique", label: "Visão geral", note: "Resumo da operação Physique", icon: BarChart3 },
      { href: "/physique/atletas", label: "Atletas", note: "Dossiês e evolução individual", icon: UsersRound },
      { href: "/physique/fichas", label: "Fichas e treinos", note: "Planos estruturados por atleta", icon: ListChecks },
      { href: "/physique/atletas/novo", label: "Novo atleta", note: "Cadastre e comece o acompanhamento", icon: ContactRound },
    ],
  },
  bank: {
    label: "Candinho Bank",
    slogan: "Um mês de cada vez.",
    brand: BRAND_ASSETS.bank.complete,
    rgb: "70, 195, 123",
    items: [
      { href: "/bank", label: "Este mês", note: "Caixa e compromissos", icon: ChartNoAxesCombined },
      { href: "/bank/atualizar", label: "Atualizar", note: "Saldos e posições reais", icon: RefreshCcw },
      { href: "/bank/entradas", label: "Entradas", note: "Receitas e a receber", icon: CircleDollarSign },
      { href: "/bank/faturas", label: "Faturas", note: "Cartões e vencimentos", icon: FileText },
      { href: "/bank/emprestimos", label: "Dívidas", note: "Empréstimos e notinhas", icon: Landmark },
      { href: "/bank/contas", label: "Contas", note: "Bancos e carteiras", icon: Wallet },
      { href: "/bank/visao-anual", label: "Visão anual", note: "Histórico e projeção", icon: History },
    ],
  },
  central: {
    label: "Candinho Central",
    slogan: "Informação, prioridade e decisão em um só lugar.",
    brand: BRAND_ASSETS.central.complete,
    rgb: "54, 161, 255",
    items: [
      { href: "/central/meu-dia", label: "Meu Dia", note: "Prioridade global com Nexus", icon: ListChecks },
      { href: "/central/agenda", label: "Agenda Global", note: "Todas as operações", icon: CalendarDays },
      { href: "/central", label: "Visão geral", note: "Saúde da Company", icon: BarChart3 },
      { href: "/central/marketing", label: "Marketing", note: "Ideias, roteiros e produção", icon: Lightbulb },
      { href: "/central/prioridades", label: "Prioridades", note: "Fila consolidada de ação", icon: ListChecks },
      { href: "/central/busca", label: "Busca Global", note: "Encontre tudo rápido", icon: Search },
      { href: "/central/alertas", label: "Alertas", note: "O que exige atenção", icon: Bell },
    ],
  },
} satisfies Record<
  GatewayOperation,
  {
    label: string;
    slogan: string;
    brand: { src: string; width: number; height: number; alt: string };
    rgb: string;
    items: Array<{ href: string; label: string; note: string; icon: typeof Home }>;
  }
>;

export function OperationEntryGatewayV4522({ operation }: { operation: GatewayOperation }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const config = CONFIG[operation];

  function enter(href: string) {
    if (leaving) return;
    setTarget(href);
    setLeaving(true);
    window.setTimeout(() => router.push(href), 520);
  }

  return (
    <section
      className={`v4521-supplements-entry v4522-operation-entry tone-${operation} ${leaving ? "is-leaving" : ""}`}
      style={{
        "--entry-rgb": config.rgb,
        "--entry-columns": String(Math.min(8, config.items.length)),
        "--entry-menu-max": `${Math.min(1240, Math.max(520, config.items.length * 154))}px`,
      } as CSSProperties}
    >
      <div className="v4521-entry-ambient" />

      <div className="v4521-entry-center">
        <span className="v4521-entry-kicker">{config.label}</span>
        <div className="v4521-entry-logo-wrap">
          <span className="v4521-entry-orbit" />
          <Link href="/dashboard" className="v4522-entry-logo-link" aria-label={`${config.label} — voltar às operações`}>
            <Image
              className="v4521-entry-logo"
              src={config.brand.src}
              alt={config.brand.alt}
              width={config.brand.width}
              height={config.brand.height}
              priority
            />
          </Link>
        </div>
        <p>{config.slogan}</p>
      </div>

      <nav className="v4521-entry-menu" aria-label={`Entrar em ${config.label}`}>
        {config.items.map(({ href, label, note, icon: Icon }, index) => (
          <button
            type="button"
            key={href}
            onClick={() => enter(href)}
            className={[target === href ? "is-target" : "", index === 0 ? "is-primary" : ""].filter(Boolean).join(" ")}
            style={{ "--entry-index": index } as CSSProperties}
          >
            <Icon size={20} />
            <span><strong>{label}</strong><small>{note}</small></span>
          </button>
        ))}
      </nav>

      <div className="v4521-entry-line" />
    </section>
  );
}
