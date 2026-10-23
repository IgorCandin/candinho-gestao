"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarDays, Search, TrendingUp, X } from "lucide-react";
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
  const [area,setArea]=useState<Area|"all">("all"),[query,setQuery]=useState("");
  const shortcuts=[...allowedOperations.flatMap(operationShortcuts),...shared].filter(item=>(item.operation==="Company"||allowedOperations.includes(item.operation))&&(!item.write||(item.operation==="Fitness"?canWriteFitness:canWriteSupplements))&&(canAccessBank||!item.href.startsWith("/bank")));
  const needle=query.trim().toLocaleLowerCase("pt-BR");
  const rows=shortcuts.filter(item=>(item.operation==="Company"||operation==="all"||item.operation===operation)&&(area==="all"||area===item.area)&&(!needle||`${item.title} ${item.note} ${item.operation}`.toLocaleLowerCase("pt-BR").includes(needle)));
  const inHeader=(item:Shortcut)=>/^\/company\/(concluir|acompanhar|produtos)\?/.test(item.href);
  const isResult=(item:Shortcut)=>item.href.startsWith("/company/resultados");
  const headerRows=rows.filter(inHeader);
  const directory=rows.filter(item=>!inHeader(item)&&!isResult(item)&&item.href!=="#agenda-gestao");
  const resultHref=operation==="all"?"/company/resultados":`/company/resultados?operacao=${operation.toLowerCase()}`;
  const groups=[{id:"day",title:"Atendimento e organização"},{id:"records",title:"Cadastros e estoque"},{id:"finance",title:"Finanças e parceiros"},{id:"system",title:"Sistema e qualidade"}] as const;
  return <div className="company-workspace-v2 company-queue-workspace company-management-workspace">
    <header className="company-workspace-head"><div><h1>Gestão</h1><p>Resultados, compromissos e ferramentas da empresa.</p></div></header>
    <nav className="management-priorities" aria-label="Acessos principais da Gestão">
      {allowedOperations.length>0&&<div className="management-results-entry"><Link className="management-primary-link" href={resultHref}><TrendingUp aria-hidden="true"/><div><strong>Resultados / Lucro mensal</strong><span>Ver evolução do lucro, faturamento e vendas.</span></div><ArrowUpRight aria-hidden="true"/></Link>{operation==="all"&&<div className="management-result-scopes">{allowedOperations.map(scope=><Link key={scope} href={`/company/resultados?operacao=${scope.toLowerCase()}`}>{scope}</Link>)}</div>}</div>}
      <Link className="management-primary-link management-agenda-link" href="#agenda-gestao"><CalendarDays aria-hidden="true"/><div><strong>Agenda e compromissos</strong><span>Consultar o calendário e organizar as próximas ações.</span></div><ArrowUpRight aria-hidden="true"/></Link>
    </nav>
    <section className="company-workspace-panel">
      <div className="completion-filters">
        <fieldset className="completion-operation"><legend>Operação</legend><div className="completion-segments">{(["all",...allowedOperations] as const).map(value=><button type="button" key={value} aria-pressed={operation===value} onClick={()=>setOperation(value)}>{value==="all"?"Todas":value}</button>)}</div></fieldset>
        <label className="completion-search"><span>Encontrar uma função</span><div><Search size={18} aria-hidden="true"/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ex.: lucro, fornecedor, etiquetas"/>{query&&<button type="button" aria-label="Limpar busca" onClick={()=>setQuery("")}><X size={17} aria-hidden="true"/></button>}</div></label>
        <details className="management-category-filter"><summary>Filtrar por tarefa{area!=="all"?` · ${areas.find(item=>item.id===area)?.label}`:" (opcional)"}</summary><fieldset className="completion-status"><legend>Tipo de tarefa</legend><div className="completion-segments">{areas.map(item=><button type="button" key={item.id} aria-pressed={area===item.id} onClick={()=>setArea(item.id)}>{item.label}</button>)}</div></fieldset></details>
      </div>
      <div className="completion-filter-result"><p role="status" aria-live="polite">{needle?`${rows.length} resultado(s) na busca`:`${operation==="all"?"Todas as operações":operation} · funções por tarefa`}</p>{(operation!=="all"||area!=="all"||query)&&<button type="button" onClick={()=>{setOperation("all");setArea("all");setQuery("")}}>Limpar filtros</button>}</div>
      <div className="management-directory">{groups.map(group=>{const items=directory.filter(item=>item.area===group.id);return items.length>0&&<section className="management-shortcut-section" key={group.id}><h2>{group.title}</h2><div className="management-shortcut-grid">{items.map(item=><Link key={item.href} href={item.href}><div><strong>{item.title}</strong>{item.operation!=="Company"&&<small>{item.operation}</small>}<p>{item.note}</p></div><ArrowUpRight size={17} aria-hidden="true"/></Link>)}</div></section>})}</div>
      {headerRows.length>0&&<details className="management-header-shortcuts" open={Boolean(needle)}><summary>Acessos do cabeçalho · vendas, atendimento e produtos</summary><div className="management-shortcut-grid">{headerRows.map(item=><Link key={item.href} href={item.href}><div><strong>{item.title}</strong><small>{item.operation}</small></div><ArrowUpRight size={17} aria-hidden="true"/></Link>)}</div></details>}
      {!rows.length&&<div className="company-empty-state"><Search/><strong>Nenhum atalho neste filtro</strong><span>Altere a busca ou escolha outra tarefa.</span></div>}
    </section>
    <details className="management-investment"><summary>Conferir investimento mensal · {operation==="all"?"operações disponíveis":operation}</summary>{operation==="all"?allowedOperations.map(scope=><OperationInvestmentPanel key={scope} data={investment} only={scope==="Fitness"?"fitness":"supplements"}/>):<OperationInvestmentPanel data={investment} only={operation==="Fitness"?"fitness":"supplements"}/>}</details>
    <section id="agenda-gestao" className="management-shared-agenda"><header><span>Company · Agenda compartilhada</span><h2>Organizar compromissos</h2><p>Agenda geral da empresa, independente do filtro de atalhos acima. Consulte os compromissos e organize as próximas ações.</p></header>{children}</section>
  </div>;
}
