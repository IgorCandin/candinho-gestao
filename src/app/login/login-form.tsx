"use client";

import Link from "next/link";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured) {
    return <div className="form"><div className="demo-banner">O banco ainda não foi conectado. Entre no modo demonstração para visualizar a primeira versão.</div><Link className="button gold" href="/dashboard">Abrir demonstração</Link></div>;
  }

  return <form className="form" onSubmit={submit}><div className="field"><label htmlFor="email">E-mail</label><input className="input" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><div className="field"><label htmlFor="password">Senha</label><input className="input" id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="form-error">{error}</div><button className="button gold" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button></form>;
}
