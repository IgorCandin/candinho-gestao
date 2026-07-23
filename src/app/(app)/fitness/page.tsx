import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  FileText,
  MessageSquareText,
  PackageOpen,
  PackageSearch,
  RotateCcw,
  ShoppingBag,
  Shirt,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import { getOperationInvestmentSnapshot } from "@/lib/bank-data";
import { getCurrentUserAccess, getFitnessDashboard } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function FitnessHomePage() {
  const [access, summary, investment] = await Promise.all([
    getCurrentUserAccess(),
    getFitnessDashboard(),
    getOperationInvestmentSnapshot(),
  ]);

  if (access.role === "sales") redirect("/fitness/produtos");

  const supabase = await createClient();

  const [
    { data: pipeline },
    { data: returns },
    { count: pendingSalesCountRaw },
    { data: postSale },
  ] = await Promise.all([
    supabase.from("fitness_commercial_pipeline_summary").select("*").maybeSingle(),
    supabase.rpc("returns_center_snapshot", { p_operation: "fitness" }),
    supabase
      .from("fitness_sales")
      .select("id", { count: "exact", head: true })
      .neq("general_status", "cancelled")
      .or("delivery_status.eq.to_deliver,payment_status.eq.receivable"),
    supabase.from("fitness_post_sale_summary").select("*").maybeSingle(),
  ]);

  const openConsignments = Number(pipeline?.open_consignments ?? 0);
  const openQuotes = Number(pipeline?.open_quotes ?? 0);
  const pendingSalesCount = Number(
    pendingSalesCountRaw ?? summary.pending_delivery + summary.pending_payment,
  );
  const postSaleNow = Number(postSale?.overdue_count ?? 0) + Number(postSale?.today_count ?? 0);

  const returnSummary =
    returns &&
    typeof returns === "object" &&
    "summary" in returns &&
    returns.summary &&
    typeof returns.summary === "object"
      ? (returns.summary as Record<string, unknown>)
      : {};

  const openReturns = Number(returnSummary.open_cases ?? 0);

  return (
    <>
      <section className="operation-home-hero operation-home-no-heading">
        <Link
          className="operation-home-primary fitness"
          href={access.canWriteFitness ? "/fitness/vendas/nova" : "/fitness/produtos"}
        >
          <ShoppingBag size={24}/>
          <div>
            <span>Ação principal</span>
            <strong>{access.canWriteFitness ? "Nova venda" : "Consultar produtos"}</strong>
            <small>{access.canWriteFitness ? "Registrar atendimento e venda da Fitness" : "Preço e disponibilidade"}</small>
          </div>
        </Link>

        <div className="operation-home-kpis">
          <Link href="/fitness/vendas">
            <span>Pendências</span>
            <strong>{pendingSalesCount}</strong>
            <small>{summary.pending_delivery} entregar · {summary.pending_payment} receber</small>
          </Link>

          <Link href="/fitness/pos-venda">
            <span>Pós-venda</span>
            <strong>{postSaleNow}</strong>
            <small>{Number(postSale?.overdue_count ?? 0)} atrasado(s) · {Number(postSale?.today_count ?? 0)} hoje</small>
          </Link>

          <Link href="/fitness/consignacoes">
            <span>Em prova</span>
            <strong>{openConsignments}</strong>
            <small>Consignações aguardando acerto</small>
          </Link>

          <Link href="/fitness/orcamentos">
            <span>Orçamentos</span>
            <strong>{openQuotes}</strong>
            <small>Propostas comerciais abertas</small>
          </Link>

          <Link href="/trocas?operacao=fitness">
            <span>Trocas / devoluções</span>
            <strong>{openReturns}</strong>
            <small>Ocorrências abertas</small>
          </Link>

          <Link href="/fitness/clientes">
            <span>Clientes ativos</span>
            <strong>{summary.active_customers}</strong>
            <small>Base comercial da Fitness</small>
          </Link>

          <Link href="/fitness/estoque">
            <span>Estoque em atenção</span>
            <strong>{summary.attention_variants}</strong>
            <small>{summary.out_of_stock_variants} zerada(s) · {summary.low_stock_variants} abaixo do mínimo</small>
          </Link>
        </div>
      </section>

      <OperationInvestmentPanel data={investment} only="fitness" compact/>

      <section className="operation-home-actions">
        <Link href="/fitness/pos-venda">
          <MessageSquareText size={20}/>
          <div>
            <strong>Pós-venda</strong>
            <span>Agenda automática 30 dias após a compra mais recente</span>
          </div>
        </Link>

        <Link href="/fitness/consignacoes">
          <Shirt size={20}/>
          <div><strong>Consignações / Provas</strong><span>Peças com clientes, devoluções e conversão em venda</span></div>
        </Link>

        <Link href="/fitness/estoque/inteligencia">
          <BarChart3 size={20}/>
          <div><strong>Inteligência de estoque</strong><span>Curva ABC, variações zeradas, excesso e peças em prova</span></div>
        </Link>

        <Link href="/fitness/orcamentos">
          <FileText size={20}/>
          <div><strong>Orçamentos</strong><span>Criar proposta, gerar PDF e converter em venda</span></div>
        </Link>

        <Link href="/fitness/pdfs">
          <FileText size={20}/>
          <div><strong>PDFs e catálogo</strong><span>Catálogo automático ou com peças selecionadas</span></div>
        </Link>

        <Link href="/trocas?operacao=fitness">
          <RotateCcw size={20}/>
          <div><strong>Trocas e devoluções</strong><span>Conferência, destino físico e reembolso sem bagunçar o estoque</span></div>
        </Link>

        <Link href="/fitness/vendas">
          <ShoppingBag size={20}/>
          <div><strong>Comercial</strong><span>Vendas, pagamentos e entregas</span></div>
        </Link>

        <Link href="/fitness/produtos">
          <PackageSearch size={20}/>
          <div><strong>Produtos</strong><span>Catálogo, peças e variações</span></div>
        </Link>

        <Link href="/fitness/estoque">
          <Warehouse size={20}/>
          <div><strong>Estoque</strong><span>Disponível, reservado, em prova e a caminho</span></div>
        </Link>

        <Link href="/fitness/clientes">
          <UsersRound size={20}/>
          <div><strong>Clientes</strong><span>Histórico e relacionamento</span></div>
        </Link>

        <Link href="/fitness/painel">
          <BarChart3 size={20}/>
          <div><strong>Painel Gerencial</strong><span>Indicadores e visão completa</span></div>
        </Link>
      </section>

      {access.canWriteFitness && (
        <Link className="operation-home-secondary" href="/fitness/pedidos/novo">
          <PackageOpen size={18}/> Novo pedido de fornecedor
        </Link>
      )}
    </>
  );
}
