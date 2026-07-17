import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactRound, MessageCircle, Search, UserRoundCheck } from "lucide-react";
import { CentralContactCreateForm } from "@/components/central-contact-create-form";
import { PageHeader } from "@/components/page-header";
import { getCentralContacts } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; vinculo?: string }> }) {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness || access.canAccessMarketing)) redirect("/dashboard");
  const params = await searchParams;
  const contacts = await getCentralContacts(500);
  const q = (params.q ?? "").trim().toLowerCase();
  const filtered = contacts.filter((contact) => {
    const matchesQuery = !q || [contact.display_name, contact.phone, contact.email, contact.instagram_username].some((value) => value?.toLowerCase().includes(q));
    const linkState = contact.supplements_customer_id || contact.fitness_customer_id ? "linked" : "unlinked";
    return matchesQuery && (!params.vinculo || params.vinculo === linkState);
  });
  const linkedCount = contacts.filter((contact) => contact.supplements_customer_id || contact.fitness_customer_id).length;
  const scopes = [access.role === "admin" ? "company" : null, access.canAccessSupplements ? "supplements" : null, access.canAccessFitness ? "fitness" : null, access.canAccessMarketing ? "marketing" : null].filter((item): item is string => Boolean(item));

  return <>
    <PageHeader eyebrow="Candinho Central" title="Clientes unificados" description="Uma identidade por pessoa, ligada às conversas e aos cadastros de Suplementos e Fitness sem apagar os registros de origem." action={<CentralContactCreateForm scopes={scopes}/>}/>

    <section className="central-contact-summary">
      <div><span>Total</span><strong>{contacts.length}</strong></div>
      <div><span>Com vínculo</span><strong>{linkedCount}</strong></div>
      <div><span>Aguardando vínculo</span><strong>{contacts.length - linkedCount}</strong></div>
    </section>

    <form className="central-contact-search" method="get">
      <label><Search size={15}/><input name="q" defaultValue={params.q ?? ""} placeholder="Buscar nome, telefone, e-mail ou Instagram..."/></label>
      <select name="vinculo" defaultValue={params.vinculo ?? ""}><option value="">Todos os contatos</option><option value="linked">Com vínculo</option><option value="unlinked">Sem vínculo</option></select>
      <button className="button ghost compact-button" type="submit">Filtrar</button>
    </form>

    <article className="panel central-contact-panel">
      <div className="panel-head"><div><h2>Contatos do Central</h2><p>Novos contatos entram automaticamente pelos canais ou podem ser cadastrados manualmente.</p></div><strong>{filtered.length}</strong></div>
      {filtered.length === 0 ? <div className="empty"><ContactRound size={26}/><strong>Nenhum contato encontrado</strong>Cadastre alguém manualmente ou altere os filtros.</div> : <div className="table-wrap"><table className="central-contact-table"><thead><tr><th>Contato</th><th>Espaço</th><th>Canais</th><th>Vínculos</th><th></th></tr></thead><tbody>{filtered.map((contact) => <tr key={contact.id}>
        <td><div className="central-contact-name"><strong>{contact.display_name}</strong><small>{contact.phone ?? contact.email ?? "Sem contato principal"}</small></div></td>
        <td><span className="badge">{contact.operation_scope === "company" ? "Company" : contact.operation_scope === "supplements" ? "Suplementos" : contact.operation_scope === "fitness" ? "Fitness" : "Marketing"}</span></td>
        <td><div className="central-contact-channels">{contact.phone && <span><MessageCircle size={13}/>WhatsApp</span>}{contact.instagram_username && <span><MessageCircle size={13}/>@{contact.instagram_username}</span>}{contact.email && <span>{contact.email}</span>}</div></td>
        <td><div className="central-contact-links">{contact.supplements_customer_id ? <Link href={`/clientes/${contact.supplements_customer_id}`}><UserRoundCheck size={13}/>Suplementos</Link> : <span>Suplementos: —</span>}{contact.fitness_customer_id ? <span className="central-linked-text"><UserRoundCheck size={13}/>Fitness vinculado</span> : <span>Fitness: —</span>}</div></td>
        <td><Link className="button ghost compact-button" href={`/central/clientes/${contact.id}`}>Abrir</Link></td>
      </tr>)}</tbody></table></div>}
    </article>
  </>;
}
