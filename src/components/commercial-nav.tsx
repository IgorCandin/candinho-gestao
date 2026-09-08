import Link from "next/link";

type CommercialSection =
  | "sales"
  | "quotes"
  | "leads"
  | "routes"
  | "actions";

const items = [
  { key: "sales", href: "/vendas", label: "Vendas" },
  { key: "quotes", href: "/orcamentos", label: "Orçamentos" },
  { key: "leads", href: "/leads", label: "Leads" },
  { key: "routes", href: "/vendas/rotas", label: "Rotas" },
  { key: "actions", href: "/suplementos/saidas", label: "Ações comerciais" },
] satisfies Array<{
  key: CommercialSection;
  href: string;
  label: string;
}>;

export function CommercialNav({ active, companyMode = false }: { active: CommercialSection; companyMode?: boolean }) {
  const companyHrefs: Record<CommercialSection, string> = {
    sales: "/company/concluir",
    quotes: "/company/vender?aba=orcamentos",
    leads: "/company/vender?aba=leads",
    routes: "/company/rotas",
    actions: "/company/vender",
  };
  return (
    <nav className="period-tabs" aria-label="Área comercial">
      {items.map((item) => (
        <Link
          className={`period-tab ${item.key === active ? "active" : ""}`}
          href={companyMode ? companyHrefs[item.key] : item.href}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
