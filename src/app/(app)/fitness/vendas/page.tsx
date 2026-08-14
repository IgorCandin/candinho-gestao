import Link from "next/link";
import {
  CalendarDays,
  FileText,
  MessageSquareText,
  PackageOpen,
  Plus,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { FitnessSalesTable } from "@/components/fitness-sales-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getFitnessSales } from "@/lib/data";
import { formatDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type PublicFitnessInterest = {
  id: string;
  name: string;
  phone: string;
  customer_id: string | null;
  fitness_product_id: string | null;
  context_summary: string | null;
  inbox_status: string | null;
  created_at: string;
};

function isOpenInterest(status: string | null) {
  return !["converted", "closed"].includes(
    String(status ?? "new").toLocaleLowerCase("pt-BR"),
  );
}

function compactContext(value: string | null) {
  if (!value) return null;

  const parts = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (item) =>
        !item.toLocaleLowerCase("pt-BR").startsWith("origem:"),
    );

  return parts.slice(0, 2).join(" · ") || null;
}

export default async function FitnessSalesPage() {
  const supabase = await createClient();

  const [
    sales,
    interestResult,
    productResult,
    quoteCountResult,
    postSaleResult,
    dashboardResult,
  ] = await Promise.all([
    getFitnessSales(),
    supabase
      .from("catalog_public_leads")
      .select(
        "id,name,phone,customer_id,fitness_product_id,context_summary,inbox_status,created_at",
      )
      .not("fitness_product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("fitness_products")
      .select("id,name")
      .order("name"),
    supabase
      .from("fitness_quotes")
      .select("id", { count: "exact", head: true })
      .eq("status", "quoted"),
    supabase
      .from("fitness_post_sale_summary")
      .select("*")
      .maybeSingle(),
    supabase
      .from("fitness_dashboard_summary_v2")
      .select("pending_delivery,pending_payment")
      .maybeSingle(),
  ]);

  const productNames = new Map(
    (productResult.data ?? []).map((item: {
      id: unknown;
      name: unknown;
    }) => [
      String(item.id),
      String(item.name ?? "Peça Fitness"),
    ]),
  );

  const interests = (
    (interestResult.data ?? []) as PublicFitnessInterest[]
  ).filter((item) => isOpenInterest(item.inbox_status));

  const pendingActions =
    Number(dashboardResult.data?.pending_delivery ?? 0) +
    Number(dashboardResult.data?.pending_payment ?? 0);

  const postSaleOpen = Number(
    postSaleResult.data?.open_count ?? 0,
  );

  const openQuotes = Number(quoteCountResult.count ?? 0);

  return (
    <>
      <PageHeader
        eyebrow="Candinho Fitness · Setor de Vendas"
        title="Vendas & relacionamento"
        description="Uma área para atender o interesse, montar orçamento, vender e continuar o relacionamento sem ficar pulando entre várias abas."
        action={
          <div className="panel-actions">
            <Link
              className="button ghost"
              href="/fitness/orcamentos/novo"
            >
              <FileText size={16} />
              Novo orçamento
            </Link>
            <Link
              className="button gold"
              href="/fitness/vendas/nova"
            >
              <Plus size={16} />
              Nova venda
            </Link>
          </div>
        }
      />

      <div className="fitness-sector-intro">
        <strong>Fluxo único: interesse → orçamento → venda → pós-venda</strong>
        <span>
          As telas continuam existindo para histórico e detalhe, mas a rotina comercial parte daqui. A cliente não precisa ser cadastrada de novo em cada etapa.
        </span>
      </div>

      <section className="stats-grid">
        <StatCard
          href="#interesses-fitness"
          icon={MessageSquareText}
          label="Interesses da Vitrine"
          value={String(interests.length)}
          note="contatos ainda abertos"
        />
        <StatCard
          href="/fitness/orcamentos"
          icon={FileText}
          label="Orçamentos abertos"
          value={String(openQuotes)}
          note="propostas aguardando decisão"
        />
        <StatCard
          href="/fitness/vendas"
          icon={ShoppingBag}
          label="Pendências da venda"
          value={String(pendingActions)}
          note="pagamento e entrega"
        />
        <StatCard
          href="/fitness/pos-venda"
          icon={MessageSquareText}
          label="Pós-venda"
          value={String(postSaleOpen)}
          note="ciclos de relacionamento abertos"
        />
      </section>

      <section className="fitness-sector-action-grid">
        <Link
          className="fitness-sector-action"
          href="/fitness/orcamentos"
        >
          <FileText size={20} />
          <span>
            <strong>Orçamentos</strong>
            <small>Propostas, PDF e conversão em venda.</small>
          </span>
        </Link>

        <Link
          className="fitness-sector-action"
          href="/fitness/clientes"
        >
          <UsersRound size={20} />
          <span>
            <strong>Clientes</strong>
            <small>Histórico Fitness usando a identidade da Candinho Company.</small>
          </span>
        </Link>

        <Link
          className="fitness-sector-action"
          href="/fitness/pos-venda"
        >
          <MessageSquareText size={20} />
          <span>
            <strong>Pós-venda</strong>
            <small>Quem precisa de contato e o que já foi reagendado.</small>
          </span>
        </Link>

        <Link
          className="fitness-sector-action"
          href="/fitness/agenda"
        >
          <CalendarDays size={20} />
          <span>
            <strong>Agenda</strong>
            <small>Compromissos e contatos da operação Fitness.</small>
          </span>
        </Link>

        <Link
          className="fitness-sector-action"
          href="/fitness/consignacoes"
        >
          <PackageOpen size={20} />
          <span>
            <strong>Peças em prova</strong>
            <small>Consignações, devoluções e acertos com clientes.</small>
          </span>
        </Link>
      </section>

      <article className="panel" id="interesses-fitness">
        <div className="panel-head">
          <div>
            <h2>Interesses que chegaram da Vitrine</h2>
            <p>
              O clique em “Me interessei” já cria a identidade da cliente e o contexto. Daqui, o orçamento abre com os dados reaproveitados.
            </p>
          </div>
          <strong>{interests.length}</strong>
        </div>

        <div className="panel-body">
          {interests.length > 0 ? (
            <div className="fitness-interest-list">
              {interests.slice(0, 12).map((interest) => {
                const product = interest.fitness_product_id
                  ? productNames.get(interest.fitness_product_id)
                  : null;
                const context = compactContext(
                  interest.context_summary,
                );

                return (
                  <div
                    className="fitness-interest-card"
                    key={interest.id}
                  >
                    <div>
                      <strong>{interest.name}</strong>
                      <span>
                        {interest.phone} · entrou em {formatDateOnly(interest.created_at)}
                      </span>
                    </div>

                    <div>
                      <strong className="fitness-interest-product">
                        {product ?? "Interesse Fitness"}
                      </strong>
                      <small>
                        {context ?? "Contexto salvo na Vitrine Fitness."}
                      </small>
                    </div>

                    <Link
                      className="button gold compact-button"
                      href={`/fitness/orcamentos/novo?interest=${encodeURIComponent(
                        interest.id,
                      )}`}
                    >
                      Montar orçamento
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty compact">
              <MessageSquareText size={24} />
              <strong>Nenhum interesse aguardando ação</strong>
              Novos contatos da Vitrine Fitness aparecem aqui automaticamente.
            </div>
          )}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Vendas</h2>
            <p>
              Histórico operacional completo. Abra a linha para pagamento, entrega e próximos passos.
            </p>
          </div>
        </div>
        <FitnessSalesTable sales={sales} />
      </article>
    </>
  );
}
