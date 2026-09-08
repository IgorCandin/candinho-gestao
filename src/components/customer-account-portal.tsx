"use client";

import { CheckCircle2, History, LoaderCircle, LockKeyhole, LogOut, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Purchase = { id: string; operation: "Suplementos" | "Fitness"; date: string; status: string; items: Array<{ name: string; quantity: number }> };

export function CustomerAccountPortal({ verifiedPhone }: { verifiedPhone: string | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState(verifiedPhone ?? "");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<{ customerName: string | null; purchases: Purchase[] } | null>(null);

  useEffect(() => {
    if (!verifiedPhone) return;
    fetch("/api/customer-portal/history").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar suas compras.");
      setHistory(payload);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Não foi possível carregar suas compras."));
  }, [verifiedPhone]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const normalized = phone.replace(/\D/g, "");
    const fullPhone = `+${normalized.startsWith("55") ? normalized : `55${normalized}`}`;
    const { error } = await createClient().auth.signInWithOtp({ phone: fullPhone });
    setBusy(false);
    if (error) { setMessage(error.message.includes("provider") ? "O envio por SMS ainda precisa ser ativado. Avise a equipe Candinho." : error.message); return; }
    setPhone(fullPhone); setStep("code"); setMessage("Código enviado. Confira suas mensagens.");
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const { error } = await createClient().auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) { setMessage("Código inválido ou vencido. Tente novamente."); return; }
    router.refresh();
  }

  async function signOut() { await createClient().auth.signOut(); router.refresh(); }

  if (!verifiedPhone) return <section className="customer-account-login">
    <div className="customer-account-heading"><ShieldCheck/><span>Área protegida</span><h1>Suas compras, em um só lugar.</h1><p>Confirme o mesmo telefone usado nas compras. Se ele já estiver no nosso cadastro, o histórico será unido automaticamente.</p></div>
    {step === "phone" ? <form onSubmit={requestCode}><label><span>Número do WhatsApp ou celular</span><div><Phone size={18}/><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="(32) 99999-9999" required/></div></label><button disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <MessageCircle/>}Receber código</button></form> : <form onSubmit={confirmCode}><label><span>Código de confirmação</span><div><LockKeyhole size={18}/><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} required/></div></label><button disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <CheckCircle2/>}Confirmar e entrar</button><button className="quiet" type="button" onClick={() => setStep("phone")}>Trocar número</button></form>}
    {message ? <p className="customer-account-message">{message}</p> : null}
    <small><ShieldCheck size={14}/>Só exibimos compras depois que o telefone é confirmado.</small>
  </section>;

  return <section className="customer-account-history"><header><div><span>MINHA CONTA</span><h1>{history?.customerName ? `Olá, ${history.customerName}` : "Seu histórico de compras"}</h1><p>Dados das compras vinculadas ao seu telefone confirmado.</p></div><button onClick={() => void signOut()}><LogOut size={16}/>Sair</button></header>{message ? <p className="customer-account-message">{message}</p> : null}{!history && !message ? <div className="customer-account-loading"><LoaderCircle className="spin"/>Carregando histórico…</div> : null}{history?.purchases.length === 0 ? <div className="customer-account-empty"><History/><strong>Nenhuma compra vinculada</strong><span>Se você já comprou, fale conosco para conferir o telefone do cadastro.</span></div> : null}<div className="customer-purchase-list">{history?.purchases.map((purchase) => <article key={purchase.id}><div><span className={purchase.operation === "Fitness" ? "fitness" : "supplements"}>{purchase.operation}</span><time>{new Date(`${purchase.date}`.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")}</time><em>{purchase.status}</em></div><ul>{purchase.items.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.quantity}×</strong>{item.name}</li>)}</ul></article>)}</div></section>;
}
