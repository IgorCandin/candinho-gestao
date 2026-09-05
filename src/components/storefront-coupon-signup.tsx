"use client";

import { useState } from "react";
import { Gift, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function StorefrontCouponSignup({ initialRemaining }: { initialRemaining: number | null }) {
  const [message, setMessage] = useState("");
  const [coupon, setCoupon] = useState("");
  const [remaining, setRemaining] = useState(initialRemaining);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("claim_storefront_coupon_v1", {
        p_name: String(form.get("name") || ""), p_email: String(form.get("email") || ""), p_phone: String(form.get("phone") || ""),
        p_consent_email: form.get("consent_email") === "on", p_consent_whatsapp: form.get("consent_whatsapp") === "on",
        p_consent_sms: form.get("consent_sms") === "on", p_terms_accepted: form.get("terms") === "on",
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setCoupon(row?.coupon_code || ""); setRemaining(Number(row?.remaining ?? 0));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o cupom.");
    } finally { setLoading(false); }
  }

  if (coupon) return <section className="storefront-coupon-success"><CheckCircle2/><span>Seu cupom de 25%</span><strong>{coupon}</strong><p>Guarde este código e apresente no atendimento. Restam {remaining} cupom(ns) nesta campanha.</p></section>;
  return <section className="storefront-growth-section" id="cupom-primeira-compra">
    <div className="storefront-growth-copy"><Gift/><span>Boas-vindas Candinho</span><h2>Cadastre-se e ganhe 25% na primeira compra.</h2><p>Você escolhe por onde quer receber ofertas. Sem mensagens em canais que não autorizou.</p>{remaining !== null && <strong>{remaining} cupom(ns) disponíveis nesta campanha</strong>}</div>
    <form className="storefront-growth-form" onSubmit={submit}>
      <label><span>Nome</span><input name="name" required minLength={2}/></label>
      <label><span>E-mail</span><input name="email" type="email"/></label>
      <label><span>WhatsApp / telefone</span><input name="phone" inputMode="tel"/></label>
      <fieldset><legend>Quero receber promoções por:</legend><label><input type="checkbox" name="consent_whatsapp"/> WhatsApp</label><label><input type="checkbox" name="consent_email"/> E-mail</label><label><input type="checkbox" name="consent_sms"/> SMS</label></fieldset>
      <label className="storefront-terms"><input type="checkbox" name="terms" required/> Aceito participar da campanha e autorizo mensagens somente nos canais marcados. Posso cancelar a autorização quando quiser.</label>
      {message && <p className="storefront-form-error">{message}</p>}
      <button disabled={loading}>{loading ? "Gerando..." : "Gerar meu cupom"}</button>
    </form>
  </section>;
}
