import Link from "next/link";
import { Boxes, ChartNoAxesCombined, CircleDollarSign, ContactRound, History, LogOut, PackageSearch, Settings, ShoppingBag, Warehouse } from "lucide-react";

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
        <header className="topbar"><div className="topbar-title">Qualidade que entrega resultado</div><div className="topbar-actions"><Link className="button ghost" href="/estoque"><Boxes size={16} />Ver estoque</Link><Link className="button gold" href="/vendas"><CircleDollarSign size={16} />Nova venda</Link></div></header>
        <div className="content">{children}</div>
      </main>
      <nav className="mobile-nav">{mobile.map(({ href, label, icon: Icon, primary }) => <Link className={`mobile-link ${primary ? "primary" : ""}`} href={href} key={href}><Icon size={19} /><span>{label}</span></Link>)}</nav>
    </div>
  );
}
