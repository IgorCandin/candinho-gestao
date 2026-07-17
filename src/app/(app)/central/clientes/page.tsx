import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactRound, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCentralContacts } from "@/lib/central-data";
import { getCurrentUserAccess } from "@/lib/data";

export default async function CentralClientsPage() {
  const access = await getCurrentUserAccess();
  if (!(access.role === "admin" || access.canAccessSupplements || access.canAccessFitness)) redirect("/dashboard");
  const contacts = await getCentralContacts();

  return <>
    <PageHeader eyebrow="Candinho Central" title="Clientes unificados" description="Uma identidade por pessoa, ligada às conversas e aos cadastros de Suplementos e Fitness sem apagar os registros de origem." />
    <article className="panel central-contact-panel">
      <div className="panel-head"><div><h2>Contatos do Central</h2><p>Novos contatos entram automaticamente pelos canais; vínculos seguros evitam duplicidade.</p></div><strong>{contacts.length}</strong></div>
      {contacts.length === 0 ? <div className="empty"><ContactRound size={26}/><strong>Nenhum contato centralizado ainda</strong>Os contatos serão criados quando as integrações começarem a receber mensagens.</div> : <div className="table-wrap"><table className="central-contact-table"><thead><tr><th>Contato</th><th>Canais</th><th>Vínculos</th><th>Observação</th></tr></thead><tbody>{contacts.map((contact) => <tr key={contact.id}>
        <td><div className="central-contact-name"><strong>{contact.display_name}</strong><small>{contact.phone ?? "Sem telefone"}</small></div></td>
        <td><div className="central-contact-channels">{contact.phone && <span><MessageCircle size={13}/>WhatsApp</span>}{contact.instagram_username && <span><MessageCircle size={13}/>{contact.instagram_username}</span>}</div></td>
        <td><div className="central-contact-links">{contact.supplements_customer_id ? <Link href={`/clientes/${contact.supplements_customer_id}`}>Suplementos</Link> : <span>Suplementos: —</span>}{contact.fitness_customer_id ? <Link href={`/fitness/clientes/${contact.fitness_customer_id}`}>Fitness</Link> : <span>Fitness: —</span>}</div></td>
        <td>{contact.notes ?? "—"}</td>
      </tr>)}</tbody></table></div>}
    </article>
  </>;
}
