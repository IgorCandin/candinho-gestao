"use client";

import { KeyRound, LoaderCircle, MailPlus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PartnerPortalAdminRow } from "@/lib/central-data";

export function PartnerPortalAccessManager({ partners }: { partners: PartnerPortalAdminRow[] }) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(partners.find((item) => !item.profile_id)?.partner_id ?? partners[0]?.partner_id ?? "");
  const selected = useMemo(() => partners.find((item) => item.partner_id === partnerId) ?? null, [partners, partnerId]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function invite(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("partner-portal-invite", {
        body: { partner_id: partnerId, email, full_name: name || selected?.contact_name || selected?.partner_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setMessage(`Convite preparado para ${email}. O perfil ficou vinculado a ${selected?.partner_name ?? "parceiro"}.`);
      setEmail(""); setName(""); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar o acesso."); }
    finally { setLoading(false); }
  }

  return <article className="panel partner-access-panel">
    <div className="panel-head"><div><h2>Acessos do Portal Parceiro</h2><p>Convide cada parceiro com um login isolado. O perfil não recebe acesso às operações internas.</p></div><ShieldCheck size={20}/></div>
    <div className="panel-body partner-access-layout">
      <form className="partner-access-form" onSubmit={invite}>
        <label className="field"><span>Parceiro</span><select className="select" value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>{partners.map((partner) => <option value={partner.partner_id} key={partner.partner_id}>{partner.partner_name}</option>)}</select></label>
        <label className="field"><span>Nome do usuário</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder={selected?.contact_name ?? selected?.partner_name ?? "Nome"}/></label>
        <label className="field"><span>E-mail do acesso</span><input className="input" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="parceiro@email.com"/></label>
        <button className="button gold" type="submit" disabled={loading || !partnerId}>{loading ? <LoaderCircle className="spin" size={16}/> : <MailPlus size={16}/>}Enviar convite</button>
        {message && <p className="partner-access-message">{message}</p>}
      </form>

      <div className="table-wrap"><table className="partner-access-table"><thead><tr><th>Parceiro</th><th>%</th><th>Usuário</th><th>Status</th></tr></thead><tbody>{partners.map((partner) => <tr key={partner.partner_id}><td><strong>{partner.partner_name}</strong><small>{partner.linked_location_name ?? partner.city ?? "Sem ponto vinculado"}</small></td><td>{partner.partnership_percent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</td><td>{partner.portal_user_email ?? "Sem acesso"}</td><td>{partner.profile_id ? <span className={`badge ${partner.portal_access_active ? "green" : "gray"}`}><KeyRound size={12}/>{partner.portal_access_active ? "Ativo" : "Pausado"}</span> : <span className="badge orange">Convidar</span>}</td></tr>)}</tbody></table></div>
    </div>
  </article>;
}
