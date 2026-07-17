"use client";

import Link from "next/link";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const typedIdentifier = identifier.trim();
      let email = typedIdentifier;

      if (!typedIdentifier.includes("@")) {
        const { data, error: resolveError } = await supabase.rpc("resolve_login_email", {
          p_username: typedIdentifier,
        });
        if (resolveError) throw resolveError;
        if (typeof data !== "string" || !data) {
          throw new Error("Usuário ou senha inválidos.");
        }
        email = data;
      }

      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw new Error("Usuário ou senha inválidos.");

      const { data: accessData } = await supabase.rpc("get_my_access_v2");
      const access = Array.isArray(accessData) ? accessData[0] : accessData;
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;
      window.location.href = access?.role === "partner" ? "/parceiro" : (safeNext ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="form">
        <div className="demo-banner">O banco ainda não foi conectado. Entre no modo demonstração para visualizar a primeira versão.</div>
        <Link className="button gold" href="/dashboard">Abrir demonstração</Link>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="identifier">Usuário</label>
        <input
          className="input"
          id="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Ex.: Candinho"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          className="input"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="form-error" aria-live="polite">{error}</div>
      <button className="button gold" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <small className="login-email-fallback">O e-mail da conta também continua funcionando como usuário.</small>
    </form>
  );
}
