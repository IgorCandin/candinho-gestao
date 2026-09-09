"use client";

import { CheckCircle2, History, LoaderCircle, LockKeyhole, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Purchase = { id: string; operation: "Suplementos" | "Fitness"; date: string; status: string; items: Array<{ name: string; quantity: number }> };

export function CustomerAccountPortal({ verifiedEmail }: { verifiedEmail: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(verifiedEmail ?? "");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<{ customerName: string | null; purchases: Purchase[] } | null>(null);

  useEffect(() => {
    if (!verifiedEmail) return;
    fetch("/api/customer-portal/history").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar suas compras.");
      setHistory(payload);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Não foi possível carregar suas compras."));
  }, [verifiedEmail]);

  async function requestCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const normalized = email.trim().toLowerCase();
    const { error } = await createClient().auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/minha-conta` },
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setEmail(normalized); setStep("code"); setMessage("Enviamos o acesso para seu e-mail. Use o código, se ele aparecer, ou toque no link da mensagem.");
  }

  async function confirmCode(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) { setMessage("Código inválido ou vencido. Tente novamente."); return; }
    router.refresh();
  }

  async function signOut() { await createClient().auth.signOut(); router.refresh(); }

  if (!verifiedEmail) return <section className="customer-account-login">
    <div className="customer-account-heading"><ShieldCheck/><span>Área protegida</span><h1>Suas compras, em um só lugar.</h1><p>Use o mesmo e-mail informado no seu cadastro. Depois da confirmação, reunimos suas compras de Suplementos e Fitness sem mostrar custos internos.</p></div>
    {step === "email" ? <form onSubmit={requestCode}><label><span>Seu e-mail</span><div><Mail size={18}/><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="voce@exemplo.com" required/></div></label><button disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Mail/>}Receber acesso</button></form> : <form onSubmit={confirmCode}><label><span>Código de confirmação</span><div><LockKeyhole size={18}/><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} required/></div></label><button disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <CheckCircle2/>}Confirmar e entrar</button><button className="quiet" type="button" onClick={() => setStep("email")}>Trocar e-mail</button></form>}
    {message ? <p className="customer-account-message">{message}</p> : null}
    <small><ShieldCheck size={14}/>Só exibimos compras depois que o e-mail é confirmado.</small>
  </section>;

  return <section className="customer-account-history"><header><div><span>MINHA CONTA</span><h1>{history?.customerName ? `Olá, ${history.customerName}` : "Seu histórico de compras"}</h1><p>Dados das compras vinculadas ao seu e-mail confirmado.</p></div><button onClick={() => void signOut()}><LogOut size={16}/>Sair</button></header>{message ? <p className="customer-account-message">{message}</p> : null}{!history && !message ? <div className="customer-account-loading"><LoaderCircle className="spin"/>Carregando histórico…</div> : null}{history?.purchases.length === 0 ? <div className="customer-account-empty"><History/><strong>Nenhuma compra vinculada</strong><span>Se você já comprou, fale conosco para conferir o e-mail do cadastro.</span></div> : null}<div className="customer-purchase-list">{history?.purchases.map((purchase) => <article key={purchase.id}><div><span className={purchase.operation === "Fitness" ? "fitness" : "supplements"}>{purchase.operation}</span><time>{new Date(`${purchase.date}`.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")}</time><em>{purchase.status}</em></div><ul>{purchase.items.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.quantity}×</strong>{item.name}</li>)}</ul></article>)}</div></section>;
}
