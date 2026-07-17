import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";

export function PartnerPageActions() {
  return <div className="page-header-actions">
    <Link className="button ghost" href="/parceiros/gerencial"><BarChart3 size={16}/>Área Gerencial</Link>
    <Link className="button gold" href="/parceiros/novo"><Plus size={16}/>Novo Parceiro</Link>
  </div>;
}
