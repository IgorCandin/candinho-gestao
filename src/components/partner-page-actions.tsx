import Link from "next/link";
import { BarChart3, KeyRound, Plus } from "lucide-react";
export function PartnerPageActions(){return <div className="page-header-actions"><Link className="button ghost" href="/parceiros/gerencial#portal-parceiro"><KeyRound size={16}/>Acessos do portal</Link><Link className="button ghost" href="/parceiros/gerencial"><BarChart3 size={16}/>Gestão da rede</Link><Link className="button gold" href="/parceiros/novo"><Plus size={16}/>Novo Parceiro</Link></div>;}
