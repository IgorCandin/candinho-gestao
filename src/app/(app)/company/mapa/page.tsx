import Link from "next/link";
import { CheckCircle2, CircleDot, Clock3, ListChecks } from "lucide-react";
import { MigrationAuditBoard, type MigrationAuditRow } from "@/components/migration-audit-board";
import { createClient } from "@/lib/supabase/server";
import { companyMigrationTools } from "@/lib/company-migration-tools";

type Step = { label: string; state: "done" | "test" | "doing" | "todo"; detail: string; href?: string };
type Block = { title: string; scope: string; steps: Step[] };

const blocks: Block[] = [
  { title: "1 · Suplementos → Company", scope: "Zerar a necessidade operacional do ERP antigo", steps: [
    { label: "Clientes e CRM", state: "test", detail: "Cadastro unificado, duplicidades consolidadas e exclusão corrigida; falta validar feed, botões e endereços.", href: "/company/clientes" },
    { label: "Vendas e orçamentos", state: "test", detail: "Venda, adicional a prazo, PDF, histórico e cancelamento pela venda vinculada estão prontos para teste.", href: "/company/orcamentos" },
    { label: "Entregas e recebimentos", state: "test", detail: "Fila unificada e entrega por item migradas; validar casos mistos de estoque e pagamento.", href: "/company/concluir" },
    { label: "Produtos, fotos, combos e promoções", state: "doing", detail: "Fotos por produto estão na Company; falta padronizar proporção e enquadramento dos banners já cadastrados, além de revisar CTs, combos e promoções.", href: "/company/produtos" },
    { label: "Estoque e transferências", state: "test", detail: "A ficha Company mostra o saldo por local; conferir os números com o estoque, transferências em lote e filtro por saldo da origem.", href: "/company/produtos/transferencias" },
    { label: "Compras e fornecedores", state: "doing", detail: "Estrutura unificada existe; falta conferir aba por aba e migrar movimentações restantes.", href: "/company/compras" },
    { label: "Nexus, hábitos e movimentações", state: "test", detail: "Entradas Company disponíveis, preservando histórico, filtros, ações e confirmações. Conferir ferramentas e retornos antes de homologar.", href: "/company/ferramentas" },
    { label: "Desativar Suplementos", state: "todo", detail: "Só depois de conferir links, medir zero acessos necessários e preservar consulta histórica." },
  ]},
  { title: "2 · Fitness → Company", scope: "Repetir a auditoria depois de Suplementos", steps: [
    { label: "Clientes, vendas e orçamentos", state: "doing", detail: "Já aparecem nas filas Company; falta comparar todos os comportamentos com o Fitness antigo." },
    { label: "Produtos, estoque e compras", state: "test", detail: "Consignações/provas, inteligência, movimentações, PDFs e Nexus disponíveis na Company. Testar criação, acerto, devolução, cancelamento e venda gerada; comparar conversões e ações profundas.", href: "/company/ferramentas" },
    { label: "Fornecedores e pós-venda", state: "doing", detail: "Acesso Company existe; falta auditoria funcional completa." },
    { label: "Desativar Fitness", state: "todo", detail: "Depende de zerar os acessos operacionais restantes." },
  ]},
  { title: "3 · Bank 2.0", scope: "Aprofundar o financeiro depois das operações", steps: [
    { label: "Planejamento mensal e cartões", state: "test", detail: "Planejamento publicado em 16/10: mês atual/próximo, reservas separadas, simulador e cartões por titular. Conferir valores sem marcar previsões como recebidas.", href: "/bank/planejamento" },
    { label: "Fechamento e vencimento separados", state: "test", detail: "Implementado na prévia do PR #30, ainda não publicado. Conferir datas reais e compra antes/no dia/depois do fechamento. A prévia do escritório (#31) é separada; acompanhamento único em docs/engineering/ACOMPANHAMENTO-BANK-ESCRITORIO.md." },
    { label: "Simulador parcelado", state: "doing", detail: "Preparados total, parcelas, cartão, compra e início ajustável. Testar 1.000 em 10x100 e fechamento. Falta ampliar dados financeiros além do próximo mês; parcelas futuras não significam orçamento conferido.", href: "/bank/planejamento" },
    { label: "Acabamento e navegação Bank", state: "test", detail: "Revisão de teclado, foco, textos longos e aba ativa preparada. Validar no iPhone: deslizar cartões, abrir/fechar detalhes, pagar e adiar somente uma conta real desejada. Não representa aprovação automática.", href: "/bank/planejamento" },
    { label: "Metas, caixa e situação financeira", state: "doing", detail: "Separar falta para a meta de situação crítica e considerar valores a receber." },
    { label: "Pendências com valor e prazo", state: "todo", detail: "Criar objetivos como consulta, viagem e compras, com urgência e data limite." },
    { label: "Caixa, entradas e faturas", state: "todo", detail: "Auditar cálculo, fechamento, projeção e ações profundas do Bank 2.0." },
  ]},
  { title: "4 · Atletas 2.0", scope: "Completar o prontuário esportivo", steps: [
    { label: "Identidade, rotas e fichas", state: "test", detail: "Marca vermelha, /atletas e fichas estão migradas; cabeçalho entra na revisão final.", href: "/atletas" },
    { label: "Avaliações e histórico", state: "todo", detail: "Migrar avaliações físicas e linha do tempo por atleta." },
    { label: "Fotos e evolução", state: "todo", detail: "Organizar comparações, arquivos e atualizações do dossiê." },
    { label: "Troca de ficha", state: "todo", detail: "Substituir a ficha ativa mantendo o histórico." },
  ]},
  { title: "5 · Central e Gestão", scope: "Dissolver a Central sem criar outra operação", steps: [
    { label: "URL e acesso", state: "done", detail: "Gestão usa /company/gestao; /company/dia ficou só como redirecionamento.", href: "/company/gestao" },
    { label: "Distribuir dados nas abas", state: "doing", detail: "Informações já aparecem em Gestão, mas ainda precisam ser separadas nos destinos corretos." },
    { label: "Aposentar telas da Central", state: "todo", detail: "Conferir agenda, visão, prioridades, busca e alertas antes de remover a navegação antiga." },
  ]},
  { title: "6 · Vitrine e integrações", scope: "Definir pelo uso real", steps: [
    { label: "Teste real da Vitrine", state: "todo", detail: "Descobrir o complemento necessário antes de fechar o produto.", href: "/vitrine" },
    { label: "E-mail", state: "todo", detail: "Retomar configuração, envio, retorno e falhas." },
    { label: "Twilio", state: "todo", detail: "Finalizar comunicação e validar o fluxo real no telefone." },
  ]},
  { title: "7 · Fechamento", scope: "Só começa após as funções principais", steps: [
    { label: "Velocidade", state: "doing", detail: "Reduzir consultas grandes, custo da fila comercial e trabalho invisível em cada navegação." },
    { label: "Computador", state: "test", detail: "Rodada funcional em andamento." },
    { label: "iPhone, tablet e paisagem", state: "todo", detail: "Revisar cabeçalhos, menus, formulários, pop-ups e rodapés sem cortes." },
    { label: "Links e nomes finais", state: "todo", detail: "Auditar rotas e confirmar zero dependência operacional do ERP antigo." },
  ]},
  { title: "Última etapa · Menus, cabeçalhos e zoom", scope: "Executar depois das demais entregas do mapa, preservando desktop e celular", steps: [
    { label: "Adaptar navegação ao zoom e à largura disponível", state: "todo", detail: "Revisar menus e cabeçalhos em 80%, 100%, 125%, 150% e 200%, incluindo janelas estreitas e mobile. Reorganizar itens sem sobreposição, corte ou perda de acesso; evitar travar a tela em 100%.", href: "/company/inicio" },
  ]},
];

blocks.push({ title: "Escritório de operações", scope: "Visão complementar; não substitui as filas nem executa ações", steps: [
  { label: "Salas e indicadores reais", state: "test", detail: "Telefones pendentes com filtro, Doctor, atenção de estoque, oportunidades Fitness e compromissos Bank, com permissões e erro distinto de zero. Conferir contadores, celular e links; ainda não homologado.", href: "/company/escritorio" },
  { label: "Anotações compartilhadas", state: "todo", detail: "Definir armazenamento auditável das notas. Reposição já usa os critérios existentes; não há agentes autônomos nem serviço de IA contratado." },
] });
blocks.push({title:"Qualidade e liberação mobile",scope:"Não confundir tela disponível com fluxo homologado",steps:[
  {label:"Regressão de navegação e ações",state:"test",detail:"Regressões de componentes/cálculos/contexto com RPCs simuladas; ações reais e permissões precisam de conferência autenticada. Sem liberar agente para gravar em produção.",href:"/company/ferramentas"},
  {label:"Duplicidade de código",state:"doing",detail:"Auditoria local identificou 12 grupos candidatos de corpos de função repetidos; não são 12 bugs e não houve fusão automática. Revisar antes de refatorar."},
  {label:"Mobile final",state:"todo",detail:"Validar iPhone real: rolagem até o fim, teclado, menus/janelas, navegação de volta, fotos, foco e ações de pagamento/entrega/acerto. Registrar cada teste; não declarar concluído antecipadamente."},
    {label:"Lotes, sabores e atalhos Central",state:"test",detail:"Entradas próprias, rastreabilidade até venda, histórico de sabores e aliases pausados preservam Company. Mesmas operações; classificação e quarentena reais aguardam homologação.",href:"/company/ferramentas"},
    {label:"Testes sem API paga",state:"test",detail:"44/44 regressões Node e 12/12 verificações Playwright de acesso ao login em desktop/celular, com gravações bloqueadas. Nenhuma API paga. Fluxos autenticados e escrita aguardam ambiente isolado; prévias usam banco real."},
    {label:"Tipos das páginas compartilhadas",state:"test",detail:"Estoque detalhado, consignações e movimentações Fitness separados em componentes compartilhados; entradas de rota não recebem companyMode. Preservados consultas, permissões, filtros e links. Conferir build e homologação nas telas.",href:"/company/fitness/movimentacoes"},
]});
blocks.push({ title: "Fluxo diário · solicitações de 17/10", scope: "Conferir ações reais e manter as pendências rastreáveis", steps: [
 {label:"Consignação: venda e devolução distintas",state:"test",detail:"Ação de venda exige peças escolhidas; devolução total explícita. Conferir geração, baixa e histórico vinculado.",href:"/company/fitness/consignacoes"},
 {label:"Histórico de consignações encerradas sem venda",state:"todo",detail:"Há encerramento como devolução total e cancelamento de Francyelle em 17/10. Confirmar o que foi vendido antes de corrigir registros. Não recriar venda nem estoque por suposição.",href:"/company/fitness/consignacoes"},
 {label:"Filas diretas do escritório",state:"test",detail:"Receber/entregar e pós-venda abrem por operação e tipo; resolução usa ações da fila. Montar compra mantém escolha real de fornecedor/quantidade.",href:"/company/escritorio"},
 {label:"Áreas do dia a dia",state:"test",detail:"Menus por tarefa no Início e Ferramentas. Refinar pela utilização; referências de microuniverso podem orientar uma próxima revisão visual.",href:"/company/ferramentas"},
 {label:"Dimensões e fluxo Fitness",state:"test",detail:"Superfície Company com espaços, fontes e formulários consistentes; oportunidades preenchem cliente e peça. Homologar demais telas/importações no celular.",href:"/company/fitness/oportunidades"},
 {label:"Entradas editáveis no Planejamento",state:"test",detail:"Conferir pendentes e corrigir recebidos na própria lista; preservar total mensal e não duplicar saldo. Conferência real depende dos valores e datas do responsável.",href:"/bank/planejamento"},
 {label:"Prioridade do estoque e atendimento",state:"test",detail:"Demanda sem disponível primeiro, atalhos por produto; Acompanhar filtra operação e prepara venda sem encerrar contato antes da confirmação.",href:"/company/estoque/atencao"},
 {label:"Doctor: React 418 atual e histórico do Bank",state:"doing",detail:"418 reproduzido em nova venda em 17/10 nesta rodada. Investigar hidratação e verificar depois da correção. 441/Load failed não são encerrados apenas por serem antigos; conferir logs/rota e nova ocorrência.",href:"/company/qualidade"},
 {label:"Rotina de teste do ERP",state:"doing",detail:"Playwright já disponível; smoke atual sem login testa só barreira de acesso. Ampliar leitura autenticada e desktop/celular. Escrita deve usar dados simulados ou transação com rollback; prévia aponta ao banco real.",href:"/company/mapa"},
 {label:"Resolução totalmente embutida de compra e Doctor",state:"todo",detail:"Pedidos ainda exigem fornecedor/condições no formulário e Doctor exige diagnóstico. Manter fluxo específico; não simular resolução por retirar um card.",href:"/company/ferramentas"},
]});

const auditRows: MigrationAuditRow[] = [
  { key: "supp-home", operation: "supplements", area: "Home e indicadores", description: "Início, avisos, metas e atalhos de trabalho diário.", legacyHref: "/suplementos/hoje", companyHref: "/company/inicio" },
  { key: "supp-potential", operation: "supplements", area: "Potencial e oportunidades", description: "Recompras, leads, cliente prioritário e recomendações.", legacyHref: "/suplementos/hoje", companyHref: "/company/vender" },
  { key: "supp-agenda", operation: "supplements", area: "Agenda", description: "Tarefas, retornos, compromissos e calendário.", legacyHref: "/agenda", companyHref: "/company/gestao" },
  { key: "supp-crm", operation: "supplements", area: "Clientes e CRM", description: "Cadastro, histórico, feed, relacionamento e exclusão de cliente.", legacyHref: "/clientes", companyHref: "/company/clientes" },
  { key: "supp-sales", operation: "supplements", area: "Vendas e orçamentos", description: "Nova venda, leitor de código, PDF, prazo, cancelamento e reabertura.", legacyHref: "/vendas/nova", companyHref: "/company/vendas/nova/suplementos" },
  { key: "supp-delivery", operation: "supplements", area: "Recebimentos e entregas", description: "Fila pendente, pagamento e entrega por item.", legacyHref: "/vendas/pendentes", companyHref: "/company/concluir" },
  { key: "supp-products", operation: "supplements", area: "Produtos, fotos, combos e promoções", description: "Catálogo, fotos e download na ficha Company; conferir padrão dos banners, saldo, custo, parceiros, combos e promoção sem estoque.", legacyHref: "/produtos", companyHref: "/company/produtos" },
  { key: "supp-stock", operation: "supplements", area: "Estoque e transferências", description: "Saldos, origem disponível, múltiplos produtos, lotes e movimentações.", legacyHref: "/estoque", companyHref: "/company/estoque" },
  { key: "supp-buy", operation: "supplements", area: "Compras e fornecedores", description: "Pedidos, fornecedores, recebimento e custo.", legacyHref: "/compras", companyHref: "/company/compras" },
  { key: "supp-management", operation: "supplements", area: "Gestão e atalhos", description: "Relatórios, central dissolvida, atalhos Alt e configurações administrativas.", legacyHref: "/suplementos/painel", companyHref: "/company/gestao" },
  { key: "fitness-home", operation: "fitness", area: "Fitness - ponto de partida", description: "Auditoria pode avançar junto com Suplementos. Comparar ferramentas e ações sem retirar telas antigas.", legacyHref: "/fitness", companyHref: "/company/ferramentas" },
  { key: "fitness-sales", operation: "fitness", area: "Vendas e orçamentos", description: "Cliente, variações, orçamento simples/confirmado, pagamento e entrega independentes.", legacyHref: "/fitness", companyHref: "/company/vendas/nova/fitness" },
  { key: "fitness-completion", operation: "fitness", area: "Conclusão e recebimentos", description: "Receber, entregar, cancelar e pagar vendas juntas, inclusive no iPhone.", legacyHref: "/fitness", companyHref: "/company/concluir?operacao=Fitness" },
  { key: "fitness-products", operation: "fitness", area: "Produtos, variações e fotos", description: "Tamanhos, cores, imagens correspondentes, categorias e preços.", legacyHref: "/fitness", companyHref: "/company/produtos?operacao=Fitness" },
  { key: "fitness-stock", operation: "fitness", area: "Estoque e histórico", description: "Saldos por local, contagem, correção, baixa, estorno e transferências.", legacyHref: "/fitness", companyHref: "/company/estoque" },
  { key: "fitness-purchases", operation: "fitness", area: "Compras e fornecedores", description: "Cobertura por tamanho, pedido, entrada e cadastro rápido.", legacyHref: "/fitness", companyHref: "/company/compras" },
  { key: "fitness-crm", operation: "fitness", area: "Clientes e pós-venda", description: "Identidade única, contatos agrupados, cancelamento e histórico comercial.", legacyHref: "/fitness", companyHref: "/company/acompanhar" },
  { key: "fitness-consignment", operation: "fitness", area: "Consignações e prova", description: "Disponível na Company. Testar envio, acerto parcial, devolução total, cancelamento e abertura da venda gerada; mesmas RPCs existentes.", legacyHref: "/fitness/consignacoes", companyHref: "/company/fitness/consignacoes" },
  { key: "fitness-results", operation: "fitness", area: "Promoções e resultados", description: "Validar ofertas, vendas entregues, lucro e evolução financeira.", legacyHref: "/fitness", companyHref: "/company/resultados?operacao=fitness" },
];

const toolLegacy: Record<string,string> = {
  "/company/fitness/conversoes":"/fitness/estoque",
  "/company/parceiros/configuracao":"/suplementos/parceiros/configuracao",
  "/company/gestao/central":"/central",
  "/company/estoque/movimentacoes":"/suplementos/movimentacoes",
  "/company/estoque/reconciliacao":"/suplementos/estoque/reconciliacao",
  "/company/estoque/fitness/inteligencia":"/fitness/estoque/inteligencia",
  "/company/fitness/movimentacoes":"/fitness/movimentacoes",
  "/company/fitness/pdfs":"/fitness/pdfs",
  "/company/fitness/nexus":"/fitness/nexus",
  "/company/suplementos/nexus":"/suplementos/nexus",
  "/company/suplementos/nexus/habitos":"/suplementos/nexus/habitos",
};
auditRows.push(...companyMigrationTools.filter(tool=>toolLegacy[tool.href]).map(tool=>({key:`tool-${tool.href.replaceAll("/","-")}`,operation:tool.operation,area:tool.title,description:`${tool.description} Disponível para teste, sem aprovação automática.`,legacyHref:toolLegacy[tool.href],companyHref:tool.href})));

const relatedPlans: Record<string,string[]> = {
 "0:0":["supp-crm"],"0:1":["supp-sales"],"0:2":["supp-delivery"],"0:3":["supp-products"],"0:4":["supp-stock"],"0:5":["supp-buy"],
 "0:6":["tool--company-suplementos-nexus","tool--company-suplementos-nexus-habitos","tool--company-estoque-movimentacoes"],
 "1:0":["fitness-crm","fitness-sales","fitness-completion"],"1:1":["fitness-products","fitness-stock","fitness-purchases","fitness-consignment"],"1:2":["fitness-crm","fitness-purchases"],
};
const roadmapRows: MigrationAuditRow[] = blocks.flatMap((block,blockIndex)=>block.steps.flatMap((step,stepIndex)=>step.state === "done" ? [] : [{
 key:`plan-${block.title}-${step.label}`.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,180),
 operation:"company" as const,area:`${block.title} · ${step.label}`,description:step.detail,
 legacyHref:step.href ?? "/company/mapa",companyHref:step.href ?? "/company/mapa",relatedKeys:relatedPlans[`${blockIndex}:${stepIndex}`],
}]));

export default async function CompanyMigrationMapPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("migration_audit_checks").select("check_key,state,notes").in("check_key", [...auditRows,...roadmapRows].map((row) => row.key));
  // O mapa é uma ferramenta de trabalho: uma indisponibilidade temporária do
  // histórico de conferências não pode derrubar a página inteira. Neste caso,
  // ele abre sem estados salvos e a pessoa ainda consegue consultar o roteiro.
  if (error) console.error("Não foi possível carregar o histórico do mapa de migração:", error.message);
  const saved = (data ?? []) as Array<{check_key:string;state:"pending"|"reviewing"|"approved"|"issue";notes:string|null}>;
  const savedByKey = new Map(saved.map(row=>[row.check_key,row.state]));
  const stateOf = (row:MigrationAuditRow)=>savedByKey.get(row.key) ?? (row.relatedKeys?.length && row.relatedKeys.every(key=>savedByKey.get(key)==="approved") ? "approved" : "pending");
  const count = (state:string)=>[...auditRows,...roadmapRows].filter(row=>stateOf(row)===state).length;
  return <div className="company-map-page company-migration-board">
    <header><span>COMPANY · CONTROLE DA MIGRAÇÃO</span><h1>O que falta resolver</h1><p>Cada linha aponta a tela, o estado real e a condição para aposentar o ERP antigo.</p></header>
    <section className="panel"><h2>Próxima conferência · 17/10</h2><p>Novas entradas: conversões de conjuntos, ficha completa de estoque, configuração e portal de parceiros; navegação e retornos das ferramentas Central preservam Company. As funções antigas continuam disponíveis.</p><p>Restam homologar as ações reais e revisar mobile, permissões, cortes, rolagem e duplicidades. Uma função disponível não é uma função já homologada; nenhuma aprovação foi marcada automaticamente.</p><Link href="/company/ferramentas">Testar ferramentas migradas</Link> · <Link href="/company/parceiros/portal">Portal de parceiros (admin)</Link></section>
    <section className="migration-scoreboard" aria-label="Resumo da migração"><article><CheckCircle2/><strong>{count("approved")}</strong><span>conferidos em OK</span></article><article><ListChecks/><strong>{count("reviewing")}</strong><span>em conferência</span></article><article><Clock3/><strong>{count("issue")}</strong><span>com falta registrada</span></article><article><CircleDot/><strong>{count("pending")}</strong><span>pendentes</span></article></section>
    {(["supplements", "fitness"] as const).map((operation) => <MigrationAuditBoard key={operation} rows={auditRows.filter((row) => row.operation === operation)} saved={(data ?? []) as Array<{ check_key: string; state: "pending" | "reviewing" | "approved" | "issue"; notes: string | null }>} />)}
    <details><summary>Planejamento por área · conferir e marcar</summary><MigrationAuditBoard rows={roadmapRows} saved={saved} title="Planejamento por área" description="Marque cada etapa como Conferir, OK ou Falta. Aprovadas somem da lista diária; histórico e links permanecem disponíveis. Aprovar uma etapa não exclui dados ou desativa operações automaticamente."/></details>
    <details><summary>Histórico das etapas concluídas</summary>{blocks.flatMap(block => block.steps.filter(step => step.state === "done").map(step => <p key={`${block.title}:${step.label}`}><strong>{step.label}</strong> · {step.detail}</p>))}</details>
    <section className="company-dna"><div><span>REGRA DE SAÍDA</span><h2>Uma tela antiga só some quando a substituta estiver completa</h2></div><p>Função migrada, dados iguais, teste real aprovado, endereço corrigido e nenhum acesso necessário registrado no ERP antigo.</p></section>
  </div>;
}
