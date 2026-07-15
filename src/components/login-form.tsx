"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();
      const login = identifier.trim();
      let email = login;

      if (!login.includes("@")) {
        const { data, error } = await supabase.rpc("resolve_login_email", {
          p_username: login,
        });

        if (error) throw error;
        if (typeof data !== "string" || !data) {
          throw new Error("Usuário ou senha inválidos.");
        }

        email = data;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error("Usuário ou senha inválidos.");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
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

      <div className="form-error" aria-live="polite">
        {message}
      </div>

      <button className="button gold" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <small className="login-email-fallback">
        O e-mail da conta também continua funcionando como usuário.
      </small>
    </form>
  );
}
