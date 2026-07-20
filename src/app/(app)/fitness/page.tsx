import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  FileText,
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
  const [{ data: pipeline }, { data: returns }] = await Promise.all([
    supabase
      .from("fitness_commercial_pipeline_summary")
      .select("*")
      .maybeSingle(),

    supabase.rpc("returns_center_snapshot", {
      p_operation: "fitness",
    }),
  ]);

  const openConsignments = Number(pipeline?.open_consignments ?? 0);
  const openQuotes = Number(pipeline?.open_quotes ?? 0);

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
          href={
            access.canWriteFitness
              ? "/fitness/vendas/nova"
              : "/fitness/produtos"
          }
        >
          <ShoppingBag size={24} />

          <div>
            <span>Ação principal</span>
            <strong>
              {access.canWriteFitness ? "Nova venda" : "Consultar produtos"}
            </strong>
            <small>
              {access.canWriteFitness
                ? "Registrar atendimento e venda da Fitness"
                : "Preço e disponibilidade"}
            </small>
          </div>
        </Link>

        <div className="operation-home-kpis">
          <Link href="/fitness/vendas">
            <span>Pendências</span>
            <strong>{summary.pending_delivery + summary.pending_payment}</strong>
            <small>
              {summary.pending_delivery} entregar · {summary.pending_payment} receber
            </small>
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
            <small>Ocorrências de pós-venda abertas</small>
          </Link>

          <Link href="/fitness/clientes">
            <span>Clientes ativos</span>
            <strong>{summary.active_customers}</strong>
            <small>Base comercial da Fitness</small>
          </Link>

          <Link href="/fitness/estoque">
            <span>Estoque em atenção</span>
            <strong>{summary.attention_variants}</strong>
            <small>{summary.out_of_stock_variants} variação(ões) zerada(s)</small>
          </Link>
        </div>
      </section>

      <OperationInvestmentPanel data={investment} only="fitness" compact />

      <section className="operation-home-actions">
        <Link href="/fitness/consignacoes">
          <Shirt size={20} />
          <div>
            <strong>Consignações / Provas</strong>
            <span>Peças com clientes, devoluções e conversão em venda</span>
          </div>
        </Link>

        <Link href="/fitness/estoque/inteligencia">
          <BarChart3 size={20} />
          <div>
            <strong>Inteligência de estoque</strong>
            <span>Curva ABC, variações zeradas, excesso e peças em prova</span>
          </div>
        </Link>

        <Link href="/fitness/orcamentos">
          <FileText size={20} />
          <div>
            <strong>Orçamentos</strong>
            <span>Criar proposta, gerar PDF e converter em venda</span>
          </div>
        </Link>

        <Link href="/fitness/pdfs">
          <FileText size={20} />
          <div>
            <strong>PDFs e catálogo</strong>
            <span>Catálogo automático ou com peças selecionadas</span>
          </div>
        </Link>

        <Link href="/trocas?operacao=fitness">
          <RotateCcw size={20} />
          <div>
            <strong>Trocas e devoluções</strong>
            <span>Conferência, destino físico e reembolso sem bagunçar o estoque</span>
          </div>
        </Link>

        <Link href="/fitness/vendas">
          <ShoppingBag size={20} />
          <div>
            <strong>Comercial</strong>
            <span>Vendas, pagamentos e entregas</span>
          </div>
        </Link>

        <Link href="/fitness/produtos">
          <PackageSearch size={20} />
          <div>
            <strong>Produtos</strong>
            <span>Catálogo, peças e variações</span>
          </div>
        </Link>

        <Link href="/fitness/estoque">
          <Warehouse size={20} />
          <div>
            <strong>Estoque</strong>
            <span>Disponível, reservado, em prova e a caminho</span>
          </div>
        </Link>

        <Link href="/fitness/clientes">
          <UsersRound size={20} />
          <div>
            <strong>Clientes</strong>
            <span>Histórico e relacionamento</span>
          </div>
        </Link>

        <Link href="/fitness/painel">
          <BarChart3 size={20} />
          <div>
            <strong>Painel Gerencial</strong>
            <span>Indicadores e visão completa</span>
          </div>
        </Link>
      </section>

      {access.canWriteFitness && (
        <Link className="operation-home-secondary" href="/fitness/pedidos/novo">
          <PackageOpen size={18} />
          Novo pedido de fornecedor
        </Link>
      )}
    </>
  );
}
