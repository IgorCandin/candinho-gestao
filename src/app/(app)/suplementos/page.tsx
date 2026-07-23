import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Boxes,
  ClipboardCheck,
  Handshake,
  MessageSquareText,
  PackageSearch,
  Radar,
  ShoppingBag,
  Truck,
  UserRoundPlus,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import { getOperationInvestmentSnapshot } from "@/lib/bank-data";
import {
  getCurrentUserAccess,
  getCustomerOpportunityRadarSummary,
  getDashboard,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_LABELS: Record<string, string> = {
  post_sale: "Pós-venda",
  follow_up: "Retorno",
  payment: "Pagamento",
  delivery: "Entrega",
  supplier: "Fornecedor",
  task: "Tarefa",
  stock: "Estoque",
  lead: "Lead",
};

const categoryLabel = (value: string) =>
  CATEGORY_LABELS[value] ?? value.replaceAll("_", " ");

export default async function SupplementsHomePage() {
  const access = await getCurrentUserAccess();
  if (access.role === "sales") redirect("/produtos");

  const [data, investment, radar] = await Promise.all([
    getDashboard(),
    getOperationInvestmentSnapshot(),
    getCustomerOpportunityRadarSummary(),
  ]);
  const supabase = await createClient();
  const [{ data: postSale }, quoteResult] = await Promise.all([
    supabase.from("post_sale_batch_summary").select("*").maybeSingle(),
    supabase.from("sales_quotes").select("id", { count: "exact", head: true }).eq("status", "quoted"),
  ]);

  const quoteCount = quoteResult.count ?? 0;
  const postSaleNow = Number(postSale?.today_count ?? 0) + Number(postSale?.overdue_count ?? 0);
  const todayActions = data.agendaToday.slice(0, 6);
  const urgentCount =
    data.agendaSummary.today_count +
    data.agendaSummary.overdue_count +
    data.operational.stale_leads_count +
    quoteCount +
    postSaleNow;
  const operationalAttention =
    data.operational.overdue_payment_count +
    data.operational.supplier_orders_open_count +
    data.operational.out_of_stock_products;

  return (
    <>
      <DemoBanner />
      <div className="operation-home-v2">
        <header className="operation-today-head">
          <div>
            <span className="eyebrow">Candinho Suplementos · Hoje</span>
            <h1>O que precisa da sua atenção agora?</h1>
            <p>
              Um resumo direto da operação. Abra o que precisa ser resolvido e continue no módulo correto,
              sem transformar a Home em outro painel gerencial.
            </p>
          </div>
          <div className="operation-today-summary">
            <span>Sinais para revisar</span>
            <strong>{urgentCount}</strong>
            <small>agenda, retornos, orçamentos e pós-venda</small>
          </div>
        </header>

        <section className="operation-kpi-grid-v2">
          <Link href="/leads">
            <span>Leads para retomar</span>
            <strong>{data.operational.stale_leads_count}</strong>
            <small>{data.operational.open_leads_count} abertos no total</small>
          </Link>
          <Link href="/orcamentos">
            <span>Orçamentos aguardando</span>
            <strong>{quoteCount}</strong>
            <small>aguardando conversão ou retorno</small>
          </Link>
          <Link href="/pedidos-pendentes">
            <span>Pedidos pendentes</span>
            <strong>{data.pendingOrdersCount}</strong>
            <small>{data.pendingPaymentCount} a receber · {data.pendingDeliveryCount} a entregar</small>
          </Link>
          <Link href="/pos-venda">
            <span>Pós-venda para agir</span>
            <strong>{postSaleNow}</strong>
            <small>{Number(postSale?.overdue_count ?? 0)} atrasado(s) · {Number(postSale?.today_count ?? 0)} hoje</small>
          </Link>
          <Link href="/estoque">
            <span>Estoque em atenção</span>
            <strong>{data.operational.stock_attention_products}</strong>
            <small>{data.operational.out_of_stock_products} produto(s) zerado(s)</small>
          </Link>
        </section>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Faça primeiro</h2>
              <p>Somente tarefas vencidas ou marcadas para hoje. Clique na linha para abrir a origem.</p>
            </div>
            <Link className="button ghost compact-button" href="/agenda">Abrir agenda</Link>
          </div>
          {todayActions.length === 0 ? (
            <div className="empty compact">
              <ClipboardCheck size={25} />
              <strong>Nenhuma tarefa datada pendente agora</strong>
              Use os cards acima para escolher a próxima ação comercial ou operacional.
            </div>
          ) : (
            <div className="operation-priority-list-v2">
              {todayActions.map((item) => (
                <Link className="operation-priority-item-v2" href={item.href || "/agenda"} key={item.event_key}>
                  <span className={`badge ${item.priority === "urgent" ? "red" : item.priority === "attention" ? "orange" : "gray"}`}>
                    {categoryLabel(item.category)}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle || "Ação operacional"}</small>
                  </div>
                  <time>{item.due_date}</time>
                </Link>
              ))}
            </div>
          )}
        </article>

        <section className="operation-quick-grid-v2">
          <Link href="/vendas/nova">
            <ShoppingBag size={20} />
            <div><strong>Novo orçamento / venda</strong><span>Registrar interesse concreto e seguir até a conversão</span></div>
          </Link>
          <Link href="/leads/novo">
            <UserRoundPlus size={20} />
            <div><strong>Novo lead</strong><span>Registrar quem apenas perguntou ou demonstrou interesse</span></div>
          </Link>
          <Link href="/suplementos/nexus">
            <Bot size={20} />
            <div><strong>Nexus IA</strong><span>Conversar usando catálogo, estoque e contexto real da cliente</span></div>
          </Link>
          <Link href="/clientes">
            <MessageSquareText size={20} />
            <div><strong>CRM e relacionamento</strong><span>Clientes, retornos, histórico e pós-venda</span></div>
          </Link>
          <Link href="/clientes/radar">
            <Radar size={20} />
            <div><strong>Radar de oportunidades</strong><span>Recompra, reativação e clientes prováveis</span></div>
          </Link>
          <Link href="/estoque">
            <Boxes size={20} />
            <div><strong>Estoque e compras</strong><span>Saldo, conferência, movimentações e reposição</span></div>
          </Link>
          <Link href="/pedidos-fornecedor/planejamento">
            <Truck size={20} />
            <div><strong>Planejar compras</strong><span>Giro, cobertura e produtos que precisam de reposição</span></div>
          </Link>
          <Link href="/produtos">
            <PackageSearch size={20} />
            <div><strong>Produtos e catálogo</strong><span>Cadastro, consulta, sabores e materiais comerciais</span></div>
          </Link>
          <Link href="/parceiros">
            <Handshake size={20} />
            <div><strong>Parceiros</strong><span>Rede, pontos de estoque, acessos e recompensas</span></div>
          </Link>
          <Link href="/suplementos/painel">
            <BarChart3 size={20} />
            <div><strong>Gestão</strong><span>Faturamento, lucro e indicadores sem competir com a rotina</span></div>
          </Link>
        </section>

        {operationalAttention > 0 && (
          <div className="operation-alert-compact">
            <AlertTriangle size={18} />
            <div>
              <strong>{operationalAttention} ponto(s) operacional(is) precisam de atenção</strong>
              <span>
                {data.operational.overdue_payment_count} cobrança(s) vencida(s) · {data.operational.supplier_orders_open_count} pedido(s) de fornecedor · {data.operational.out_of_stock_products} ruptura(s)
              </span>
            </div>
            <Link className="button ghost compact-button" href="/estoque">Revisar operação</Link>
          </div>
        )}

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Gestão, não urgência</h2>
              <p>Indicadores continuam disponíveis, mas ficam abaixo do trabalho que precisa ser feito hoje.</p>
            </div>
            <Link className="button ghost" href="/suplementos/painel"><BarChart3 size={16} /> Painel Gerencial</Link>
          </div>
          <div className="panel-body">
            <p className="form-help">
              Possíveis clientes no Radar: <strong>{radar.possible_customers}</strong> · Alta prioridade: <strong>{radar.high_priority}</strong> · A receber: <strong>{data.operational.pending_payment_count}</strong> venda(s).
            </p>
          </div>
        </article>
        <OperationInvestmentPanel data={investment} only="supplements" compact />
      </div>
    </>
  );
}
