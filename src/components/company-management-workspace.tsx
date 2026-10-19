"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { OperationInvestmentPanel } from "@/components/operation-investment-panel";
import type { OperationInvestmentSnapshot } from "@/lib/bank-data";
import "./company-completion-filters.css";
import "./company-management-workspace.css";

type Operation = "Suplementos" | "Fitness";
type Area = "day" | "records" | "finance" | "system";
type Shortcut = { title: string; note: string; href: string; area: Area; operation: Operation | "Company"; write?: boolean };
const shared: Shortcut[] = [
  {title:"Organizar compromissos",note:"Consultar a agenda compartilhada e organizar as próximas tarefas.",href:"#agenda-gestao",area:"day",operation:"Company"},
  {title:"Escritório de operações",note:"Ver as pendências e abrir a fila que precisa de atenção.",href:"/company/escritorio",area:"day",operation:"Company"},
  {title:"Rotas de atendimento",note:"Planejar visitas e entregas por cidade.",href:"/company/rotas",area:"day",operation:"Company"},
  {title:"Ferramentas das operações",note:"Encontrar PDFs, Nexus, hábitos e outras ferramentas por área.",href:"/company/ferramentas",area:"day",operation:"Company"},
  {title:"Fornecedores",note:"Consultar contatos e históricos; escolher a operação dentro da tela.",href:"/company/fornecedores",area:"records",operation:"Company"},
  {title:"Imprimir etiquetas",note:"Selecionar produtos e variações para imprimir códigos e preços.",href:"/company/gestao/etiquetas",area:"records",operation:"Company"},
  {title:"Histórico de orçamentos",note:"Localizar propostas, consultar itens, cancelar ou reabrir o atendimento.",href:"/company/orcamentos",area:"records",operation:"Company"},
  {title:"Parceiros",note:"Conferir estoque, vendas, percentuais e acertos de Suplementos.",href:"/company/parceiros/gerencial",area:"finance",operation:"Suplementos"},
  {title:"Sala do Dono",note:"Consultar valores e o panorama executivo da empresa.",href:"/company/central",area:"finance",operation:"Company"},
  {title:"Candinho Bank",note:"Conferir entradas, contas, faturas e fechamento financeiro.",href:"/bank",area:"finance",operation:"Company"},
  {title:"Planejamento financeiro",note:"Revisar previsões de entrada e organizar os próximos pagamentos.",href:"/bank/planejamento",area:"finance",operation:"Company"},
  {title:"Atalhos de teclado",note:"Consultar e remover combinações com Alt.",href:"/company/atalhos",area:"system",operation:"Company"},
  {title:"Mapa da migração",note:"Conferir o andamento das melhorias e os itens que faltam validar.",href:"/company/mapa",area:"system",operation:"Company"},
  {title:"Qualidade e atritos",note:"Investigar erros, lentidão e problemas registrados nas telas.",href:"/company/qualidade",area:"system",operation:"Company"},
];
function operationShortcuts(operation: Operation): Shortcut[] {
  const scope=operation === "Fitness" ? "fitness" : "supplements";
  return [
    {title:"Concluir vendas",note:"Resolver pagamentos e entregas pendentes.",href:`/company/concluir?operacao=${operation}`,area:"day",operation},
    {title:"Atender e acompanhar",note:"Registrar pós-venda, resposta da cliente e próximo retorno.",href:`/company/acompanhar?operacao=${operation}`,area:"day",operation},
    {title:"Produtos e cadastros",note:"Consultar o catálogo, editar dados e cadastrar produtos.",href:`/company/produtos?operacao=${operation}`,area:"records",operation},
    {title:"Conferir estoque",note:operation === "Fitness" ? "Conferir peças por tamanho e cor." : "Conferir saldos, locais, lotes e movimentações.",href:`/company/estoque?operacao=${scope}`,area:"records",operation},
    {title:"Resultados da operação",note:"Acompanhar faturamento, lucro e evolução das vendas.",href:`/company/resultados?operacao=${operation.toLowerCase()}`,area:"finance",operation},
    {title:"Custos e insumos",note:"Cadastrar materiais e conferir os custos da operação.",href:`/company/custos-insumos?operacao=${scope}`,area:"finance",operation,write:true},
    ...(operation === "Fitness" ? [
      {title:"Consignações e provas",note:"Acompanhar peças com clientes, devoluções e conclusão da venda.",href:"/company/fitness/consignacoes",area:"day" as const,operation},
      {title:"Possibilidades de venda",note:"Conferir tamanhos observados e preparar uma oferta com estoque.",href:"/company/fitness/oportunidades",area:"day" as const,operation},
    ] : []),
  ];
}
const areas: Array<{id:Area|"all";label:string}>=[{id:"day",label:"Dia a dia"},{id:"records",label:"Cadastros e estoque"},{id:"finance",label:"Valores e resultados"},{id:"system",label:"Sistema"},{id:"all",label:"Tudo"}];
export function CompanyManagementWorkspace({allowedOperations,canWriteSupplements,canWriteFitness,canAccessBank,investment,initialOperation="all",children}:{allowedOperations:Operation[];canWriteSupplements:boolean;canWriteFitness:boolean;canAccessBank:boolean;investment:OperationInvestmentSnapshot;initialOperation?:"all"|Operation;children:ReactNode}) {
  const [operation,setOperation]=useState<"all"|Operation>(allowedOperations.includes(initialOperation as Operation)?initialOperation:"all");
  const [area,setArea]=useState<Area|"all">("day"),[query,setQuery]=useState("");
  const shortcuts=[...allowedOperations.flatMap(operationShortcuts),...shared].filter(item=>(item.operation==="Company"||allowedOperations.includes(item.operation))&&(!item.write||(item.operation==="Fitness"?canWriteFitness:canWriteSupplements))&&(canAccessBank||!item.href.startsWith("/bank")));
  const needle=query.trim().toLocaleLowerCase("pt-BR");
  const rows=shortcuts.filter(item=>(item.operation==="Company"||operation==="all"||item.operation===operation)&&(area==="all"||area===item.area)&&(!needle||`${item.title} ${item.note} ${item.operation}`.toLocaleLowerCase("pt-BR").includes(needle)));
  return <div className="company-workspace-v2 company-queue-workspace company-management-workspace">
    <header className="company-workspace-head"><div><span>Company · Gestão</span><h1>Gestão</h1><p>Escolha a operação e o que precisa fazer. Cada atalho indica a tarefa que você encontra ao entrar.</p></div><Link className="management-agenda-link" href="#agenda-gestao">Abrir agenda compartilhada</Link></header>
    <section className="company-workspace-panel">
      <div className="completion-filters">
        <fieldset className="completion-operation"><legend>Operação</legend><div className="completion-segments">{(["all",...allowedOperations] as const).map(value=><button type="button" key={value} aria-pressed={operation===value} onClick={()=>setOperation(value)}>{value==="all"?"Todas":value}</button>)}</div></fieldset>
        <label className="completion-search"><span>Buscar tarefa ou ferramenta</span><div><Search size={18}/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ex.: fornecedor, estoque, agenda"/>{query&&<button type="button" aria-label="Limpar busca" onClick={()=>setQuery("")}><X size={17}/></button>}</div></label>
        <fieldset className="completion-status"><legend>O que você precisa fazer?</legend><div className="completion-segments">{areas.map(item=><button type="button" key={item.id} aria-pressed={area===item.id} onClick={()=>setArea(item.id)}>{item.label}</button>)}</div></fieldset>
      </div>
      <div className="completion-filter-result"><p role="status" aria-live="polite">{rows.length} atalho(s) · {operation==="all"?"Todas as operações":operation}</p>{(operation!=="all"||area!=="day"||query)&&<button type="button" onClick={()=>{setOperation("all");setArea("day");setQuery("")}}>Limpar filtros</button>}</div>
      <p className="management-scope-note">Os atalhos da Company são compartilhados e continuam disponíveis em qualquer operação. A agenda abaixo reúne os compromissos da empresa.</p>
      {([...allowedOperations,"Company"] as const).map(scope=>{const items=rows.filter(item=>item.operation===scope);return items.length>0&&<section className="management-shortcut-section" key={scope}><h2>{scope==="Company"?"Company · áreas compartilhadas":scope}</h2><div className="management-shortcut-grid">{items.map(item=><Link key={item.href} href={item.href}><div><strong>{item.title}</strong><p>{item.note}</p></div><ArrowUpRight size={19} aria-hidden="true"/></Link>)}</div></section>})}
      {!rows.length&&<div className="company-empty-state"><Search/><strong>Nenhum atalho neste filtro</strong><span>Altere a busca ou escolha outra tarefa.</span></div>}
    </section>
    <details className="management-investment"><summary>Conferir investimento mensal · {operation==="all"?"operações disponíveis":operation}</summary>{operation==="all"?allowedOperations.map(scope=><OperationInvestmentPanel key={scope} data={investment} only={scope==="Fitness"?"fitness":"supplements"}/>):<OperationInvestmentPanel data={investment} only={operation==="Fitness"?"fitness":"supplements"}/>}</details>
    <section id="agenda-gestao" className="management-shared-agenda"><header><span>Company · Agenda compartilhada</span><h2>Organizar compromissos</h2><p>Agenda geral da empresa, independente do filtro de atalhos acima. Consulte os compromissos e organize as próximas ações.</p></header>{children}</section>
  </div>;
}
