import Link from "next/link";
import { CircleDollarSign, PackageCheck, Truck } from "lucide-react";

export function CompanyPriorityPreview({ receive, deliver, incoming }: { receive: number; deliver: number; incoming: number }) {
  const cards = [
    { label: "A receber", value: receive, note: "vendas aguardando pagamento", href: "/company/concluir?filtro=receber", icon: CircleDollarSign },
    { label: "A entregar", value: deliver, note: "vendas aguardando entrega", href: "/company/concluir?filtro=entregar", icon: PackageCheck },
    { label: "A caminho", value: incoming, note: "unidades em pedidos de fornecedor", href: "/company/compras", icon: Truck },
  ];
  return <section className="company-priority-preview" aria-label="Prioridades de hoje">
    {cards.map(({ label, value, note, href, icon: Icon }) => <Link href={href} key={label}><Icon size={18}/><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></Link>)}
  </section>;
}
