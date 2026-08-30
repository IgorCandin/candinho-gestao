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

export function CommercialNav({ active }: { active: CommercialSection }) {
  return (
    <nav className="period-tabs" aria-label="Área comercial">
      {items.map((item) => (
        <Link
          className={`period-tab ${item.key === active ? "active" : ""}`}
          href={item.href}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
