"use client";

import Link from "next/link";
import { Edit3, MessageCircle, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDateOnly } from "@/lib/format";

export type CompanyCustomerRow = { id: string; fitnessId: string | null; name: string; phone: string | null; city: string | null; operations: Array<"Suplementos" | "Fitness">; purchaseCount: number; totalSpent: number; lastPurchaseOn: string | null; activityCount: number; activitySummary: string; detailHref: string; editHref: string | null };

export function CompanyCustomerRegistry({ customers, canWriteSupplements, canWriteFitness }: { customers: CompanyCustomerRow[]; canWriteSupplements: boolean; canWriteFitness: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [operation, setOperation] = useState<"all" | "Suplementos" | "Fitness" | "Ambas">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visible = useMemo(() => customers.filter((customer) => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    const matchesOperation = operation === "all" || (operation === "Ambas" ? customer.operations.length === 2 : customer.operations.length === 1 && customer.operations.includes(operation));
    return matchesOperation && (!needle || `${customer.name} ${customer.phone ?? ""} ${customer.city ?? ""}`.toLocaleLowerCase("pt-BR").includes(needle));
  }), [customers, operation, query]);

  async function remove(customer: CompanyCustomerRow) {
    if (!window.confirm(`Excluir o cadastro vazio de ${customer.name}?`)) return;
    setDeleting(customer.id); setMessage(null);
    const isFitnessOnly = customer.operations.length === 1 && customer.operations[0] === "Fitness";
    try { const response = await fetch(`/api/company/customers/${customer.id}?operation=${isFitnessOnly ? "fitness" : "supplements"}`, { method: "DELETE" }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error ?? "Não foi possível excluir."); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível excluir."); }
    finally { setDeleting(null); }
  }

  return <div className="company-workspace-v2 company-registry-v2">
    <header className="company-workspace-head company-registry-head"><div><span>COMPANY · CRM GLOBAL</span><h1>Ficha de Clientes</h1><p>Uma pessoa, uma ficha — com Suplementos e Fitness reunidos no mesmo histórico.</p></div><div className="company-registry-create">{canWriteSupplements || canWriteFitness ? <Link href="/company/clientes/novo"><Plus size={16}/> Novo cliente</Link> : null}</div></header>
    <section className="company-workspace-panel"><div className="company-workspace-toolbar"><div><button className={operation === "all" ? "active" : ""} onClick={() => setOperation("all")}>Todos · {customers.length}</button><button className={operation === "Suplementos" ? "active" : ""} onClick={() => setOperation("Suplementos")}>Só Suplementos</button><button className={operation === "Fitness" ? "active" : ""} onClick={() => setOperation("Fitness")}>Só Fitness</button><button className={operation === "Ambas" ? "active" : ""} onClick={() => setOperation("Ambas")}>Ambas</button></div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, telefone ou cidade"/></label></div>{message ? <p className="company-registry-message">{message}</p> : null}<p className="company-workspace-count">{visible.length} pessoa(s)</p>
      <div className="company-registry-grid">{visible.map((customer) => { const isFitnessOnly = customer.operations.length === 1 && customer.operations[0] === "Fitness"; const canDelete = customer.activityCount === 0 && (isFitnessOnly ? canWriteFitness : canWriteSupplements); const phone = (customer.phone ?? "").replace(/\D/g, ""); return <article key={customer.id}><div className="company-registry-avatar"><UserRound/></div><div><div className="company-registry-badges">{customer.operations.map((item) => <span key={item}>{item}</span>)}</div><Link href={customer.detailHref}><h2>{customer.name}</h2></Link><p>{[customer.city, customer.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</p><small>{customer.purchaseCount} compra(s) · {formatCurrency(customer.totalSpent)}{customer.lastPurchaseOn ? ` · Última em ${formatDateOnly(customer.lastPurchaseOn)}` : ""}</small>{customer.activityCount > 0 ? <small className="company-registry-lock">Exclusão protegida: {customer.activitySummary || "há histórico vinculado"}</small> : null}</div><div className="company-registry-actions">{phone ? <a href={`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}`} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle/></a> : null}{customer.editHref ? <Link href={customer.editHref} title="Editar"><Edit3/></Link> : null}<button type="button" disabled={!canDelete || deleting === customer.id} onClick={() => void remove(customer)} title={canDelete ? "Excluir cadastro vazio" : customer.activityCount > 0 ? `Não pode excluir: ${customer.activitySummary || "há histórico vinculado"}` : "Sem permissão para excluir"}><Trash2/></button></div></article>; })}</div>
    </section>
  </div>;
}
