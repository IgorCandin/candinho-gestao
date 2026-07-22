import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Boxes, CalendarDays, ContactRound, FileSearch, ImageIcon, MessageCircle, PackageSearch, Search, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCentralGlobalSearch } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

const typeMeta: Record<string, { label: string; icon: typeof Search }> = {
  contact: { label: "Contato", icon: ContactRound },
  conversation: { label: "Conversa", icon: MessageCircle },
  product: { label: "Produto · Suplementos", icon: PackageSearch },
  fitness_product: { label: "Produto · Fitness", icon: Boxes },
  partner: { label: "Parceiro", icon: Store },
  task: { label: "Tarefa", icon: CalendarDays },
  media: { label: "Mídia", icon: ImageIcon },
};

export default async function CentralSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const results = q.length >= 2 ? await getCentralGlobalSearch(q, 100) : [];

  return <>
    <PageHeader eyebrow="Candinho Central" title="Busca Global" description="Encontre clientes, conversas, produtos, parceiros, tarefas e mídias sem precisar lembrar em qual operação cada item está." />
    <article className="panel central-global-search-panel">
      <div className="panel-body">
        <form method="get" className="central-global-search-form">
          <Search size={20}/><input autoFocus name="q" defaultValue={q} placeholder="Digite pelo menos 2 letras, telefone, produto, parceiro..."/><button className="button gold" type="submit"><Search size={16}/>Buscar</button>
        </form>
      </div>
    </article>

    {!q ? <div className="central-search-empty panel"><div className="panel-body"><FileSearch size={30}/><strong>Uma busca para a Company inteira</strong><span>Exemplo: nome de cliente, telefone, creatina, ItaPharma, tarefa ou nome de um arquivo.</span></div></div> : q.length < 2 ? <div className="central-search-empty panel"><div className="panel-body"><Search size={30}/><strong>Digite mais um caractere</strong><span>A busca começa com pelo menos 2 caracteres.</span></div></div> : results.length === 0 ? <div className="central-search-empty panel"><div className="panel-body"><FileSearch size={30}/><strong>Nenhum resultado para “{q}”</strong><span>Tente outro nome, telefone ou palavra-chave.</span></div></div> : <section className="central-search-results">
      <div className="central-search-result-head"><strong>{results.length} resultado(s)</strong><span>Ordenados por relevância</span></div>
      {results.map((item, index) => {
        const meta = typeMeta[item.result_type] ?? { label: item.result_type, icon: Bot };
        const Icon = meta.icon;
        return <Link className="central-search-result-row panel" href={item.href} key={`${item.result_type}-${item.entity_id}-${index}`}>
          <span className={`central-search-result-icon scope-${item.operation_scope}`}><Icon size={19}/></span>
          <div><small>{meta.label} · {item.operation_scope === "supplements" ? "Suplementos" : item.operation_scope === "fitness" ? "Fitness" : item.operation_scope === "marketing" ? "Marketing" : "Company"}</small><strong>{item.title}</strong><span>{item.subtitle || "Abrir resultado"}</span></div>
          <b>Abrir</b>
        </Link>;
      })}
    </section>}
  </>;
}
