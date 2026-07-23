import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, History, MessageSquareText, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PostSaleNexusCard } from "@/components/post-sale-nexus-card";
import { StatCard } from "@/components/stat-card";
import { getCurrentUserAccess } from "@/lib/data";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function FitnessPostSaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getCurrentUserAccess();
  if (!access.canWriteFitness) redirect("/fitness");

  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: cycle, error: cycleError },
    { data: sales, error: salesError },
    { data: history, error: historyError },
  ] = await Promise.all([
    supabase.from("fitness_post_sale_overview").select("*").eq("customer_id", id).maybeSingle(),
    supabase.from("fitness_post_sale_cycle_sales").select("*").eq("customer_id", id).order("quoted_on", { ascending: false }),
    supabase.from("fitness_post_sale_history").select("*").eq("customer_id", id).order("completed_at", { ascending: false }).limit(6),
  ]);

  if (cycleError) throw cycleError;
  if (salesError) throw salesError;
  if (historyError) throw historyError;
  if (!cycle) notFound();

  const initialMeta =
    cycle.ai_metadata && typeof cycle.ai_metadata === "object" && !Array.isArray(cycle.ai_metadata)
      ? cycle.ai_metadata as Record<string, unknown>
      : null;

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Pós-venda"
        title={cycle.customer_name}
        description={`${cycle.sale_count} compra(s) reunida(s) · contato previsto para ${formatDateOnly(cycle.due_on)}`}
        action={<Link className="button ghost" href="/fitness/pos-venda"><ArrowLeft size={16}/>Voltar</Link>}
      />

      <section className="stats-grid">
        <StatCard label="Compras no ciclo" value={String(cycle.sale_count)} note={cycle.product_summary} icon={ShoppingBag}/>
        <StatCard label="Total comprado" value={formatCurrency(Number(cycle.total_amount ?? 0))} note="desde o último pós-venda concluído" icon={MessageSquareText}/>
        <StatCard label="Última compra" value={formatDateOnly(cycle.last_sale_on)} note="a data do pós-venda acompanha esta compra" icon={History}/>
        <StatCard label="Contato previsto" value={formatDateOnly(cycle.due_on)} note={cycle.customer_phone ?? cycle.instagram ?? "Sem contato cadastrado"} icon={CalendarDays}/>
      </section>

      <div className="partner-portal-grid">
        <div style={{ display: "grid", gap: 16 }}>
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Compras deste pós-venda</h2>
                <p>Se a cliente comprou novamente antes dos 30 dias, as compras aparecem juntas aqui.</p>
              </div>
            </div>
            <div className="panel-body">
              {(sales ?? []).map((sale) => (
                <div key={sale.sale_id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <strong>{formatDateOnly(sale.quoted_on)} · {formatCurrency(Number(sale.total_amount ?? 0))}</strong>
                  <p>{sale.product_summary ?? cycle.product_summary}</p>
                  {sale.notes && <small>{sale.notes}</small>}
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Histórico de pós-vendas</h2>
                <p>Contatos anteriores ficam preservados para o Nexus não repetir a mesma abordagem.</p>
              </div>
            </div>
            <div className="panel-body">
              {(history ?? []).length ? (
                (history ?? []).map((item) => (
                  <div key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <strong>{formatDateTime(item.completed_at)} · {item.product_summary ?? "Pós-venda"}</strong>
                    {item.outcome && <p>{item.outcome}</p>}
                    {item.notes && <small>{item.notes}</small>}
                  </div>
                ))
              ) : (
                <div className="empty compact">
                  <History size={25}/>
                  <strong>Primeiro ciclo de pós-venda</strong>
                  O histórico começa a ser construído quando este contato for concluído.
                </div>
              )}
            </div>
          </article>
        </div>

        <PostSaleNexusCard
          business="fitness"
          customerId={id}
          phone={cycle.customer_phone}
          initialMessage={cycle.ai_last_message}
          initialMeta={initialMeta}
          status={cycle.status}
          dueOn={cycle.due_on}
        />
      </div>
    </>
  );
}
