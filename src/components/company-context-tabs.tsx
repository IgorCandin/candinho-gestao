import Link from "next/link";

export type CompanyContextTab = { label: string; href: string; note?: string };

export function CompanyContextTabs({ label, items }: { label: string; items: CompanyContextTab[] }) {
  return <nav className="company-context-tabs" aria-label={label}>
    {items.map((item, index) => <Link href={item.href} key={`${item.href}-${item.label}`}>
      <span>{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong>{item.note ? <small>{item.note}</small> : null}
    </Link>)}
  </nav>;
}
