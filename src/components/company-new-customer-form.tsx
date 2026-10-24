"use client";

import { UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NewCustomerForm, type PartnerOption } from "@/components/new-customer-form";
import type { CustomerOption } from "@/lib/types";
import "./company-customer-drafts.css";

export function CompanyNewCustomerForm({ canWriteSupplements, canWriteFitness, customers = [], partners = [] }: { canWriteSupplements: boolean; canWriteFitness: boolean; customers?: CustomerOption[]; partners?: PartnerOption[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [instagram, setInstagram] = useState("");
  const [identified, setIdentified] = useState(false);
  const resolvedId = useRef<string | null>(null);

  async function resolveCustomer() {
      const supabase = createClient();
      let coreId: string | null = resolvedId.current;
      if (!coreId && canWriteFitness) {
        // The resolver creates/links both records in a single database transaction.
        // This prevents the half-saved Company customer that used to remain after
        // the Fitness step failed.
        const { data: fitnessId, error } = await supabase.rpc("fitness_resolve_customer", { p_customer_id: null, p_name: name, p_phone: phone || null, p_instagram: instagram || null, p_city: city || null, p_source: "Candinho Company" });
        if (error) throw error;
        const { data: linked, error: linkedError } = await supabase.from("fitness_customers").select("core_customer_id").eq("id", String(fitnessId)).single();
        if (linkedError) throw linkedError;
        coreId = typeof linked.core_customer_id === "string" ? linked.core_customer_id : null;
      } else if (!coreId && canWriteSupplements) {
        const digits = phone.replace(/\D/g, "");
        if (digits) {
          const { data: existing, error: lookupError } = await supabase
            .from("customers")
            .select("id,phone")
            .eq("active", true)
            .limit(5000);
          if (lookupError) throw lookupError;
          const match = (existing ?? []).find((item) => String(item.phone ?? "").replace(/\D/g, "") === digits);
          coreId = match?.id ? String(match.id) : null;
        }
        if (!coreId) {
          const { data, error } = await supabase.rpc("create_customer", { p_name: name, p_phone: phone || null, p_city: city || null, p_reference: null, p_notes: notes || null });
          if (error) throw error;
          coreId = String(data);
        }
      }
      if (!coreId) throw new Error("Cliente identificado sem ficha Company. Confira o cadastro antes de tentar novamente.");
      resolvedId.current = coreId;
      setIdentified(true);
      if (!canWriteSupplements) return { id: coreId, name };
      const { data: customer, error: customerError } = await supabase.from("customers").select("name").eq("id", coreId).single();
      if (customerError) throw customerError;
      return { id: coreId, name: String(customer.name) };
  }

  return <div className="company-new-customer"><NewCustomerForm customers={customers} partners={partners} companyMode allowRelationships={canWriteSupplements} createCustomer={resolveCustomer} basicFields={<fieldset disabled={identified} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <div className="company-new-customer-intro"><UserRound/><div><strong>Cliente da Company</strong><p>Cadastre a pessoa uma vez. Suplementos e Fitness serão identificados automaticamente quando houver compra.</p></div></div>
    <div className="company-new-customer-grid">
      <label className="field field-span-two"><span>Nome</span><input className="input" required value={name} onChange={(event) => setName(event.target.value)}/></label>
      <label className="field"><span>Telefone</span><input className="input" value={phone} onChange={(event) => setPhone(event.target.value)}/></label>
      <label className="field"><span>Cidade</span><input className="input" value={city} onChange={(event) => setCity(event.target.value)}/></label>
      {canWriteFitness ? <label className="field"><span>Instagram</span><input className="input" value={instagram} onChange={(event) => setInstagram(event.target.value)}/></label> : null}
      <label className="field field-span-two"><span>Observações</span><textarea className="textarea" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
    </div>
  </fieldset>}/></div>;
}
