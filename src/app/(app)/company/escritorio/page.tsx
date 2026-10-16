import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getBankMonthHomeDataV2 } from "@/lib/bank-home-data-v2";
import "./office.css";

export const dynamic = "force-dynamic";

type Signal = { label: string; count: number | null; href: string };
type Room = { name: string; color: string; signals: Signal[] };

export default async function CompanyOfficePage() {
  const access = await getCurrentUserAccess();
  if (!access.active || access.role === "partner") redirect("/dashboard");
  const db = await createClient();
  const supplements = access.role === "admin" || access.canAccessSupplements;
  const fitness = access.role === "admin" || access.canAccessFitness;
  const bank = access.role === "admin" || access.canAccessBank;
  async function count(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
    try {
      const result = await query;
      if (result.error) return null;
      return result.count;
    } catch { return null; }
  }
  const [missingSupplementPhone, missingFitnessPhone, supplementDelivery, fitnessDelivery, bankMonth] = await Promise.all([
    supplements ? count(db.from("customers").select("id", { count: "exact", head: true }).eq("active", true).or("phone.is.null,phone.eq.")) : null,
    fitness ? count(db.from("fitness_customers").select("id", { count: "exact", head: true }).or("phone.is.null,phone.eq.")) : null,
    supplements ? count(db.from("sales").select("id", { count: "exact", head: true }).eq("record_type", "sale").neq("general_status", "cancelled").neq("delivery_status", "delivered")) : null,
    fitness ? count(db.from("fitness_sales").select("id", { count: "exact", head: true }).neq("general_status", "cancelled").neq("delivery_status", "delivered")) : null,
    bank ? getBankMonthHomeDataV2().catch(() => null) : null,
  ]);
  const rooms: Room[] = [];
  if (supplements || fitness) rooms.push({ name: "Company · Clientes", color: "#d5b27b", signals: [
    ...(supplements ? [{ label: "Cadastros Suplementos ativos sem telefone", count: missingSupplementPhone, href: "/company/clientes" }] : []),
    ...(fitness ? [{ label: "Cadastros Fitness sem telefone", count: missingFitnessPhone, href: "/company/clientes" }] : []),
  ] });
  if (supplements) rooms.push({ name: "Suplementos", color: "#79c8b4", signals: [{ label: "Vendas não canceladas aguardando entrega", count: supplementDelivery, href: "/company/concluir?operacao=Suplementos" }] });
  if (fitness) rooms.push({ name: "Fitness", color: "#bda2e8", signals: [{ label: "Vendas não canceladas aguardando entrega", count: fitnessDelivery, href: "/company/concluir?operacao=Fitness" }] });
  if (bank) rooms.push({ name: "Bank", color: "#8abde3", signals: [
    { label: "Compromissos vencidos do mês consultado", count: bankMonth?.overdue.length ?? null, href: "/bank/planejamento" },
    { label: "Compromissos com vencimento hoje", count: bankMonth?.dueToday.length ?? null, href: "/bank/planejamento" },
    { label: "Próximos compromissos do mês", count: bankMonth?.upcoming.length ?? null, href: "/bank/planejamento" },
  ] });
  const consulted = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return <main className="operation-office">
    <header><Link href="/company/inicio">Voltar à Company</Link><h1>Seu escritório de operações</h1><p>Entre em uma sala e encontre o próximo passo. Os personagens sinalizam pendências; não executam ações.</p><small>Consulta em {consulted} · atualize a página para consultar novamente. Se uma consulta estiver indisponível, tente atualizar; as filas originais continuam acessíveis.</small></header>
    <nav aria-label="Salas do escritório">{rooms.map((room, index) => <a href={`#sala-${index}`} key={room.name}>{room.name}</a>)}</nav>
    <section className="office-floor" aria-label="Planta das operações">{rooms.map((room, index) => {
      const unknown = room.signals.some(signal => signal.count === null);
      const pending = room.signals.some(signal => (signal.count ?? 0) > 0);
      return <article id={`sala-${index}`} className="office-room" style={{ borderColor: room.color }} key={room.name}>
        <h2>{room.name}</h2>
        <div className="office-scene" aria-hidden="true"><div className="office-window"/><div className="office-desk"/><div className="office-person" style={{ color: room.color }}><i/><b/><span>{unknown ? "?" : pending ? "!" : "✓"}</span></div><div className="office-plant"/></div>
        <p className="office-state">{unknown ? "Há dados indisponíveis para conferir" : pending ? "Precisa da sua atenção" : "Sem pendências nos indicadores consultados"}</p>
        <ul>{room.signals.map(signal => <li key={signal.label}><Link href={signal.href}><strong>{signal.count === null ? "Indisponível" : signal.count}</strong><span>{signal.label}</span><small>Abrir fila</small></Link></li>)}</ul>
        <small>Origem: {room.name.startsWith("Bank") ? "agenda Bank do mês atual, sem duplicar faturas" : room.name.startsWith("Company") ? "cadastros com telefone vazio ou nulo; operações não somadas para evitar contar a mesma pessoa duas vezes" : "vendas cadastradas; não indica quantidade de peças"}.</small>
      </article>;
    })}</section>
    {!rooms.length ? <p>Nenhuma operação disponível para seu acesso.</p> : null}
    <aside><h2>Como funcionam os agentes?</h2><p>Aqui, cada personagem é um sinalizador. Um agente de IA de verdade recebe uma tarefa, consulta informações e usa ferramentas. Ações como editar cadastros, comprar ou pagar exigiriam permissões e aprovação próprias. Nenhuma delas é executada por esta tela.</p><p>Este primeiro mapa cobre apenas os indicadores listados, não todas as pendências do ERP. Reposição e anotações compartilhadas são próximas etapas; as filas atuais continuam disponíveis.</p><Link href="/company/compras">Abrir compras e reposição</Link> · <Link href="/company/mapa">Ver roteiro da migração</Link></aside>
  </main>;
}
