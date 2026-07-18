"use client";

import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PartnerPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function save() {
    setMessage(null);
    if (password.length < 8) { setMessage({ type: "error", text: "Use pelo menos 8 caracteres." }); return; }
    if (password !== confirm) { setMessage({ type: "error", text: "As duas senhas precisam ser iguais." }); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setMessage({ type: "ok", text: "Senha atualizada com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível atualizar a senha." });
    } finally {
      setLoading(false);
    }
  }

  return <article className="panel partner-security-card">
    <div className="panel-head"><div><h2>Senha de acesso</h2><p>Troque a senha temporária por uma senha pessoal e difícil de adivinhar.</p></div><KeyRound size={20}/></div>
    <div className="panel-body partner-password-form">
      <label className="field"><span>Nova senha</span><input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
      <label className="field"><span>Confirmar nova senha</span><input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Digite novamente"/></label>
      <button className="button gold" type="button" onClick={save} disabled={loading}>{loading ? <LoaderCircle className="spin" size={15}/> : <ShieldCheck size={15}/>}Atualizar senha</button>
      {message && <p className={message.type === "ok" ? "form-success" : "form-error"}>{message.text}</p>}
    </div>
  </article>;
}
