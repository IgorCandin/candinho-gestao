import Link from "next/link";

type CommercialSection =
  | "sales"
  | "quotes"
  | "leads"
  | "actions";

const items: Array<{
  key: CommercialSection;
  href: string;
  label: string;
}> = [
  { key: "sales", href: "/vendas", label: "Vendas" },
  { key: "quotes", href: "/orcamentos", label: "Orçamentos" },
  { key: "leads", href: "/leads", label: "Leads" },
  {
    key: "actions",
    href: "/suplementos/saidas",
    label: "Ações comerciais",
  },
];

export function CommercialNav({
  active,
}: {
  active: CommercialSection;
}) {
  return (
    <nav className="period-tabs" aria-label="Área comercial">
      {items.map((item) => (
        <Link
          className={`period-tab ${
            item.key === active ? "active" : ""
          }`}
          href={item.href}
          key={item.key}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
