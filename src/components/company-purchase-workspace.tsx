"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Boxes, PackageCheck, Search, ShoppingCart, Truck, X } from "lucide-react";
import { CompanyPurchaseSuggestions, type CompanyPurchaseSuggestion } from "@/components/company-purchase-suggestions";
import { PurchaseOrderCancelAction } from "@/components/purchase-order-cancel-action";
import { purchaseStage, type CompanyWorkflowOrder, type PurchaseOperation, type PurchaseStage } from "@/lib/company-purchase-workflow";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import "./company-completion-filters.css";
import "./company-purchase-workspace.css";

type Props = { suggestions: CompanyPurchaseSuggestion[]; orders: CompanyWorkflowOrder[]; leanMode: boolean; allowedOperations: PurchaseOperation[]; canWriteSupplements: boolean; canWriteFitness: boolean; initialOperation?: "all" | PurchaseOperation; initialStage?: PurchaseStage; today: string; inventoryTools?: ReactNode };

export function CompanyPurchaseWorkspace({ suggestions, orders, leanMode, allowedOperations, canWriteSupplements, canWriteFitness, initialOperation = "all", initialStage = "buy", today, inventoryTools }: Props) {
  const [operation, setOperation] = useState<"all" | PurchaseOperation>(initialOperation);
  const [stage, setStage] = useState<PurchaseStage>(initialStage);
  const [query, setQuery] = useState("");
  const openOrders = useMemo(() => orders.filter(order => purchaseStage(order)), [orders]);
  const scopedOrders = useMemo(() => openOrders.filter(order => operation === "all" || order.operation === operation), [openOrders, operation]);
  const scopedSuggestions = useMemo(() => suggestions.filter(item => operation === "all" || item.operation === operation), [suggestions, operation]);
  const counts = { buy: scopedSuggestions.length, incoming: scopedOrders.length, receive: scopedOrders.filter(order => purchaseStage(order) === "receive").length, all: scopedSuggestions.length + scopedOrders.length };
  const needle = query.trim().toLocaleLowerCase("pt-BR");
  const visibleOrders = scopedOrders.filter(order => !needle || `${order.supplierName} ${order.summary} ${order.operation}`.toLocaleLowerCase("pt-BR").includes(needle));
  const visibleSuggestions = scopedSuggestions.filter(item => !needle || `${item.name} ${item.detail}`.toLocaleLowerCase("pt-BR").includes(needle));
  const visibleCount = (stage === "all" || stage === "buy" ? visibleSuggestions.length : 0) + visibleOrders.filter(order => stage === "all" || stage === "incoming" || purchaseStage(order) === stage).length;
  const stages: Array<{ id: PurchaseStage; label: string }> = [{ id: "buy", label: "Comprar" }, { id: "incoming", label: "A caminho" }, { id: "receive", label: "Falta receber" }, { id: "all", label: "Tudo" }];
  return <div className="company-workspace-v2 company-queue-workspace company-purchase-workspace">
    <section className="company-workspace-metrics" aria-label={`Resumo: ${operation === "all" ? "todas as operações" : operation}`}>
      <article><ShoppingCart/><span>Itens para comprar</span><strong>{counts.buy}</strong></article>
      <article><Truck/><span>Pedidos a caminho</span><strong>{counts.incoming}</strong></article>
      <article><PackageCheck/><span>Recebidos em parte</span><strong>{counts.receive}</strong></article>
      <article><Boxes/><span>Unidades a receber</span><strong>{scopedOrders.reduce((sum, order) => sum + order.pendingUnits, 0)}</strong></article>
    </section>
    <section className="company-workspace-panel">
      <div className="completion-filters">
        <fieldset className="completion-operation"><legend>Operação</legend><div className="completion-segments">{(["all", ...allowedOperations] as const).map(value => <button type="button" key={value} aria-pressed={operation === value} onClick={() => setOperation(value)}><span>{value === "all" ? "Todas" : value}</span><span className="completion-filter-count">{suggestions.filter(item => value === "all" || item.operation === value).length + openOrders.filter(order => value === "all" || order.operation === value).length}</span></button>)}</div></fieldset>
        <label className="completion-search"><span>Buscar nesta fila</span><div><Search size={18} aria-hidden="true"/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Produto, fornecedor, cor ou tamanho"/>{query && <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X size={17}/></button>}</div></label>
        <fieldset className="completion-status"><legend>Em qual etapa você precisa agir?</legend><div className="completion-segments">{stages.map(item => <button type="button" key={item.id} aria-pressed={stage === item.id} onClick={() => setStage(item.id)}><span>{item.label}</span><span className="completion-filter-count">{counts[item.id]}</span></button>)}</div></fieldset>
      </div>
      <div className="completion-filter-result"><p className="company-workspace-count" role="status" aria-live="polite">{visibleCount} aviso(s) · {operation === "all" ? "Todas as operações" : operation}</p>{(operation !== "all" || stage !== "all" || query) && <button type="button" onClick={() => { setOperation("all"); setStage("all"); setQuery(""); }}>Limpar filtros</button>}</div>
      <p className="purchase-count-help">A caminho inclui os pedidos recebidos em parte, também disponíveis em Falta receber. Em Tudo, cada pedido aparece uma única vez. As unidades a receber somam somente o que falta chegar.</p>
      {(stage === "buy" || stage === "all") && <CompanyPurchaseSuggestions suggestions={suggestions} leanMode={leanMode} controlledOperation={operation} searchQuery={query} hideToolbar canWriteSupplements={canWriteSupplements} canWriteFitness={canWriteFitness}/>}
      {(["incoming", "receive"] as const).filter(value => stage === "all" || stage === value).map(value => {
        const rows = visibleOrders.filter(order => stage === "incoming" || purchaseStage(order) === value);
        return <section className="purchase-order-stage" key={value}><header><h2>{value === "incoming" ? "A caminho" : "Falta receber"}</h2><p>{value === "incoming" ? "Pedidos com mercadoria ainda a chegar, incluindo recebidos em parte. Confira com o fornecedor a previsão de chegada." : "Pedidos recebidos em parte. Confira e registre somente as unidades que ainda faltam chegar."}</p></header>
          <div className="purchase-workflow-orders">{rows.map(order => {
            const canWrite = order.operation === "Fitness" ? canWriteFitness : canWriteSupplements;
            return <article className="purchase-workflow-order" key={`${order.operation}-${order.id}`}>
              <header><div><span className="purchase-operation-tag">{order.operation}{purchaseStage(order) === "receive" ? " · Recebido em parte" : ""}</span><h3>{order.supplierName}</h3></div><strong>{formatCurrency(order.total)}</strong></header>
              <p>{order.summary || "Confira os itens no pedido."}</p>
              <div className="purchase-order-dates"><span>Pedido em {formatDateOnly(order.orderedOn)}</span><span className={order.expectedOn && order.expectedOn < today ? "purchase-overdue" : ""}>{order.expectedOn ? `Previsão: ${formatDateOnly(order.expectedOn)}${order.expectedOn < today ? " · vencida" : ""}` : "Previsão não informada"}</span></div>
              <dl className="purchase-receipt-numbers"><div><dt>Pedido</dt><dd>{order.orderedUnits}</dd></div><div><dt>Recebido</dt><dd>{order.receivedUnits}</dd></div><div><dt>Falta receber</dt><dd>{order.pendingUnits}</dd></div></dl>
              <progress max={Math.max(order.orderedUnits, 1)} value={Math.max(0, Math.min(order.receivedUnits, order.orderedUnits))} aria-label={`${order.receivedUnits} de ${order.orderedUnits} unidades recebidas`}/>
              {order.waitingSales > 0 && <p className="purchase-waiting-sales">{order.waitingSales} venda(s) aguardam esta mercadoria.</p>}
              <div className="purchase-next-action"><span>O que fazer</span><p>{purchaseStage(order) === "receive" ? `Confira as ${order.pendingUnits} unidade(s) restantes e registre a chegada por item.` : "Ao chegar, confira os itens e registre as quantidades recebidas."}</p><Link href={order.href}>{canWrite ? "Conferir e receber itens" : "Ver itens e recebimentos"}</Link></div>
              {canWrite && order.operation === "Suplementos" && <details className="purchase-other-actions"><summary>Outras ações do pedido</summary><PurchaseOrderCancelAction orderId={order.id} status={order.status}/></details>}
            </article>;
          })}</div>
          {!rows.length && <div className="company-empty-state"><PackageCheck/><strong>{value === "incoming" ? "Nenhum pedido a caminho neste filtro." : "Nenhum recebimento parcial neste filtro."}</strong><span>Escolha outra operação, etapa ou busca para conferir os demais avisos.</span></div>}
        </section>;
      })}
    </section>
    {inventoryTools && operation !== "Fitness" && <details className="purchase-inventory-tools"><summary>Configurar grupos e critérios de reposição de Suplementos</summary>{inventoryTools}</details>}
  </div>;
}
