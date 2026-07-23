import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CalendarDays, CheckCircle2, MessageSquareText } from "lucide-react";
import { FitnessPostSaleWorklist } from "@/components/fitness-post-sale-worklist";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function FitnessPostSalePage() {
  const access = await getCurrentUserAccess();
  if (!access.canWriteFitness) redirect("/fitness");

  const supabase = await createClient();
  const [{ data: summary }, { data: rows, error }] = await Promise.all([
    supabase.from("fitness_post_sale_summary").select("*").maybeSingle(),
    supabase.from("fitness_post_sale_overview").select("*").order("due_on").order("customer_name"),
  ]);

  if (error) throw error;
  const list = rows ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Relacionamento"
        title="Pós-venda"
        description="Cada cliente ganha um único ciclo 30 dias após a compra mais recente. Se comprar novamente antes do contato, as compras são reunidas e a data anda automaticamente."
        action={<Link className="button ghost" href="/fitness/vendas">Voltar ao comercial</Link>}
      />

      <section className="stats-grid">
        <StatCard label="Em aberto" value={String(Number(summary?.open_count ?? 0))} note="ciclos aguardando contato" icon={MessageSquareText}/>
        <StatCard label="Vencidos" value={String(Number(summary?.overdue_count ?? 0))} note="precisam de atenção" icon={CalendarClock}/>
        <StatCard label="Hoje" value={String(Number(summary?.today_count ?? 0))} note="contatos previstos" icon={CalendarDays}/>
        <StatCard label="Próximos 7 dias" value={String(Number(summary?.next_seven_days_count ?? 0))} note="agenda próxima" icon={CheckCircle2}/>
      </section>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Agenda de relacionamento</h2>
            <p>Abra a cliente, gere uma mensagem personalizada com o Nexus e conclua ou reagende o contato.</p>
          </div>
          <strong>{list.length}</strong>
        </div>
        <div className="panel-body">
          <FitnessPostSaleWorklist rows={list}/>
        </div>
      </article>
    </>
  );
}
