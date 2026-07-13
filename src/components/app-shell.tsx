import Link from "next/link";
import { ChartNoAxesCombined, CircleDollarSign, ClipboardPlus, ContactRound, History, LogOut, PackageSearch, Settings, ShoppingBag, UserRoundPlus, Warehouse } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Visão geral", icon: ChartNoAxesCombined, primary: true },
  { href: "/produtos", label: "Produtos", icon: PackageSearch },
  { href: "/estoque", label: "Estoque", icon: Warehouse },
  { href: "/vendas", label: "Vendas e leads", icon: ShoppingBag },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/movimentacoes", label: "Movimentações", icon: History },
];

const mobile = nav.slice(0, 5);

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand"><span className="brand-mark">CC</span><span><strong>CANDINHO COMPANY</strong><span>Gestão integrada</span></span></Link>
        <nav className="nav">
          {nav.map(({ href, label, icon: Icon, primary }) => <Link className={`nav-link ${primary ? "primary" : ""}`} href={href} key={href}><Icon size={18} />{label}</Link>)}
        </nav>
        <div className="sidebar-footer">
          <p>Base própria para substituir o AppSheet sem perder as regras operacionais.</p>
          <Link className="nav-link" href="/configuracoes"><Settings size={18} />Configurações</Link>
          <form action="/auth/signout" method="post"><button className="nav-link" style={{ width: "100%", border: 0, background: "transparent" }}><LogOut size={18} />Sair</button></form>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">Qualidade que entrega resultado</div>
          <div className="topbar-actions">
            <Link className="button ghost" href="/vendas?novo=lead"><UserRoundPlus size={16} />Novo lead</Link>
            <Link className="button ghost" href="/movimentacoes?novo=pedido-fornecedor"><ClipboardPlus size={16} />Novo pedido de fornecedor</Link>
            <Link className="button gold" href="/vendas?novo=venda"><CircleDollarSign size={16} />Nova venda</Link>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
      <nav className="mobile-nav">{mobile.map(({ href, label, icon: Icon, primary }) => <Link className={`mobile-link ${primary ? "primary" : ""}`} href={href} key={href}><Icon size={19} /><span>{label}</span></Link>)}</nav>
    </div>
  );
}
