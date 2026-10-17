"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import "./company-missing-phones.css";

export type MissingPhoneCustomer = { id: string; name: string; city: string | null };
export type PhoneOperation = "Suplementos" | "Fitness";

function PhoneRow({ customer, operation, canWrite, onSaved }: { customer: MissingPhoneCustomer; operation: PhoneOperation; canWrite: boolean; onSaved: (name: string) => void }) {
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/company/customers/${customer.id}/phone`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation, phone }) });
      const result = await response.json() as { error?: string; ok?: boolean };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Não foi possível salvar. Tente novamente.");
      onSaved(customer.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar. Tente novamente."); }
    finally { setSaving(false); }
  }
  return <li className="cp-row"><div><h2>{customer.name}</h2><p>{customer.city || "Cidade não informada"} · {operation}</p><span>Falta preencher: telefone</span></div>
    <form onSubmit={save} aria-label={`Preencher telefone de ${customer.name}`}>
      <label htmlFor={`phone-${customer.id}`}>Telefone com DDD</label>
      <div className="cp-entry"><input id={`phone-${customer.id}`} type="tel" inputMode="tel" autoComplete="off" placeholder="(11) 99999-9999" maxLength={32} required disabled={!canWrite || saving} value={phone} onChange={event => setPhone(event.target.value)} aria-describedby={error ? `error-${customer.id}` : undefined}/><button type="submit" disabled={!canWrite || saving}>{saving ? "Salvando…" : "Salvar telefone"}</button></div>
      {error ? <p className="cp-error" role="alert" id={`error-${customer.id}`}>{error}</p> : null}
      {!canWrite ? <p>Seu acesso permite consultar, mas não alterar este cadastro.</p> : null}
    </form>
  </li>;
}

export function CompanyMissingPhones({ customers, operation, total, page, pageSize, canWrite, allowedOperations }: { customers: MissingPhoneCustomer[]; operation: PhoneOperation; total: number; page: number; pageSize: number; canWrite: boolean; allowedOperations: PhoneOperation[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const remaining = customers.filter(customer => !saved.includes(customer.id));
  const href = (operation: PhoneOperation, page = 1) => `/company/clientes/telefones?operacao=${operation}&pagina=${page}`;
  return <main className="company-phone-queue">
    <Link href="/company/escritorio">Voltar ao escritório</Link>
    <header><h1>Telefones pendentes</h1><p>Preencha o telefone diretamente nesta fila. Cada linha mostra o cadastro e o campo que está faltando.</p></header>
    <nav aria-label="Operação dos cadastros">{allowedOperations.map(item => <Link key={item} href={href(item)} aria-current={item === operation ? "page" : undefined}>{item}</Link>)}</nav>
    <p className="cp-count">{Math.max(0, total - customers.filter(customer => saved.includes(customer.id)).length)} cadastro(s) sem telefone em {operation}. {operation === "Suplementos" ? "Somente cadastros ativos." : "Inclui cadastros ativos e inativos, conforme o aviso do escritório."}</p>
    <p role="status" aria-live="polite">{message}</p>
    {remaining.length ? <ul className="cp-list">{remaining.map(customer => <PhoneRow key={customer.id} customer={customer} operation={operation} canWrite={canWrite} onSaved={name => { setSaved(previous => [...previous, customer.id]); setMessage(`Telefone de ${name} salvo. Pendência removida desta fila.`); router.refresh(); }}/>)}</ul> : <p className="cp-empty">{total === 0 ? "Nenhum cadastro sem telefone nesta operação." : "Os cadastros desta página foram preenchidos. Atualize a fila para continuar."}</p>}
    <nav aria-label="Paginação da fila">{page > 1 ? <Link href={href(operation, page - 1)}>Página anterior</Link> : null}{page * pageSize < total ? <Link href={href(operation, page + 1)}>Próxima página</Link> : null}<button type="button" onClick={() => router.refresh()}>Atualizar fila</button></nav>
  </main>;
}
