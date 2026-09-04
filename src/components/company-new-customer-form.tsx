"use client";

import { LoaderCircle, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CompanyNewCustomerForm({ canWriteSupplements, canWriteFitness }: { canWriteSupplements: boolean; canWriteFitness: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [instagram, setInstagram] = useState("");
  const [supplements, setSupplements] = useState(canWriteSupplements);
  const [fitness, setFitness] = useState(!canWriteSupplements && canWriteFitness);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supplements && !fitness) { setMessage("Escolha ao menos uma operação."); return; }
    setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      let coreId: string | null = null;
      if (supplements) {
        const { data, error } = await supabase.rpc("create_customer", { p_name: name, p_phone: phone || null, p_city: city || null, p_reference: null, p_notes: notes || null });
        if (error) throw error;
        coreId = String(data);
      }
      if (fitness) {
        const { error } = await supabase.rpc("fitness_resolve_customer", { p_customer_id: coreId, p_name: name, p_phone: phone || null, p_instagram: instagram || null, p_city: city || null, p_source: "Candinho Company" });
        if (error) throw error;
      }
      router.push("/company/clientes");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar o cliente."); }
    finally { setLoading(false); }
  }

  return <form className="company-new-customer" onSubmit={submit}>
    <div className="company-new-customer-intro"><UserRound/><div><strong>Identidade Company</strong><p>O cadastro é único; as operações aparecem como partes da mesma pessoa.</p></div></div>
    <div className="company-new-customer-grid">
      <label className="field field-span-two"><span>Nome</span><input className="input" required value={name} onChange={(event) => setName(event.target.value)}/></label>
      <label className="field"><span>Telefone</span><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)}/></label>
      <label className="field"><span>Cidade</span><input className="input" value={city} onChange={(event) => setCity(event.target.value)}/></label>
      {canWriteFitness ? <label className="field"><span>Instagram</span><input className="input" value={instagram} onChange={(event) => setInstagram(event.target.value)}/></label> : null}
      <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
    </div>
    <fieldset className="company-operation-choice"><legend>Onde essa pessoa será atendida?</legend>{canWriteSupplements ? <label><input type="checkbox" checked={supplements} onChange={(event) => setSupplements(event.target.checked)}/><span>Suplementos</span></label> : null}{canWriteFitness ? <label><input type="checkbox" checked={fitness} onChange={(event) => setFitness(event.target.checked)}/><span>Fitness</span></label> : null}</fieldset>
    {message ? <p className="company-registry-message">{message}</p> : null}
    <button className="company-new-customer-save" disabled={loading}>{loading ? <LoaderCircle className="spin"/> : <Save/>} Salvar cliente</button>
  </form>;
}
