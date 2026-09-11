import Link from "next/link";
import { CheckCircle2, CircleDot, Clock3, ExternalLink, ListChecks } from "lucide-react";
import { MigrationAuditBoard, type MigrationAuditRow } from "@/components/migration-audit-board";
import { createClient } from "@/lib/supabase/server";

type Step = { label: string; state: "done" | "test" | "doing" | "todo"; detail: string; href?: string };
type Block = { title: string; scope: string; steps: Step[] };

const blocks: Block[] = [
  { title: "1 · Suplementos → Company", scope: "Zerar a necessidade operacional do ERP antigo", steps: [
    { label: "Clientes e CRM", state: "test", detail: "Cadastro unificado, duplicidades consolidadas e exclusão corrigida; falta validar feed, botões e endereços.", href: "/company/clientes" },
    { label: "Vendas e orçamentos", state: "test", detail: "Venda, adicional a prazo, PDF, histórico e cancelamento pela venda vinculada estão prontos para teste.", href: "/company/orcamentos" },
    { label: "Entregas e recebimentos", state: "test", detail: "Fila unificada e entrega por item migradas; validar casos mistos de estoque e pagamento.", href: "/company/concluir" },
    { label: "Produtos, combos e promoções", state: "doing", detail: "Painel e indicadores migrados; revisar CTs, combos ativos e promoção sem estoque.", href: "/company/produtos" },
    { label: "Estoque e transferências", state: "test", detail: "Estoque está em Gestão; transferências em lote e filtro por saldo da origem aguardam teste.", href: "/company/produtos/transferencias" },
    { label: "Compras e fornecedores", state: "doing", detail: "Estrutura unificada existe; falta conferir aba por aba e migrar movimentações restantes.", href: "/company/compras" },
    { label: "Desativar Suplementos", state: "todo", detail: "Só depois de conferir links, medir zero acessos necessários e preservar consulta histórica." },
  ]},
  { title: "2 · Fitness → Company", scope: "Repetir a auditoria depois de Suplementos", steps: [
    { label: "Clientes, vendas e orçamentos", state: "doing", detail: "Já aparecem nas filas Company; falta comparar todos os comportamentos com o Fitness antigo." },
    { label: "Produtos, estoque e compras", state: "doing", detail: "Dados unificados parcialmente; faltam consignações, conversões, variações e movimentações." },
    { label: "Fornecedores e pós-venda", state: "doing", detail: "Acesso Company existe; falta auditoria funcional completa." },
    { label: "Desativar Fitness", state: "todo", detail: "Depende de zerar os acessos operacionais restantes." },
  ]},
  { title: "3 · Bank 2.0", scope: "Aprofundar o financeiro depois das operações", steps: [
    { label: "Cabeçalho, Nexus e atualização", state: "done", detail: "Navegação, atalho do Nexus e correções de atualização foram migrados.", href: "/bank" },
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
];

const labels = { done: "Concluído", test: "Testar", doing: "Em execução", todo: "Pendente" } as const;
const allSteps = blocks.flatMap((block) => block.steps);

const auditRows: MigrationAuditRow[] = [
  { key: "supp-home", operation: "supplements", area: "Home e indicadores", description: "Início, avisos, metas e atalhos de trabalho diário.", legacyHref: "/suplementos/hoje", companyHref: "/company/inicio" },
  { key: "supp-potential", operation: "supplements", area: "Potencial e oportunidades", description: "Recompras, leads, cliente prioritário e recomendações.", legacyHref: "/suplementos/hoje", companyHref: "/company/vender" },
  { key: "supp-agenda", operation: "supplements", area: "Agenda", description: "Tarefas, retornos, compromissos e calendário.", legacyHref: "/agenda", companyHref: "/company/gestao" },
  { key: "supp-crm", operation: "supplements", area: "Clientes e CRM", description: "Cadastro, histórico, feed, relacionamento e exclusão de cliente.", legacyHref: "/clientes", companyHref: "/company/clientes" },
  { key: "supp-sales", operation: "supplements", area: "Vendas e orçamentos", description: "Nova venda, leitor de código, PDF, prazo, cancelamento e reabertura.", legacyHref: "/vendas/nova", companyHref: "/company/vendas/nova/suplementos" },
  { key: "supp-delivery", operation: "supplements", area: "Recebimentos e entregas", description: "Fila pendente, pagamento e entrega por item.", legacyHref: "/vendas/pendentes", companyHref: "/company/concluir" },
  { key: "supp-products", operation: "supplements", area: "Produtos, combos e promoções", description: "Catálogo, saldo, custo, parceiros, combos e promoção sem estoque.", legacyHref: "/produtos", companyHref: "/company/produtos" },
  { key: "supp-stock", operation: "supplements", area: "Estoque e transferências", description: "Saldos, origem disponível, múltiplos produtos, lotes e movimentações.", legacyHref: "/estoque", companyHref: "/company/estoque" },
  { key: "supp-buy", operation: "supplements", area: "Compras e fornecedores", description: "Pedidos, fornecedores, recebimento e custo.", legacyHref: "/compras", companyHref: "/company/compras" },
  { key: "supp-management", operation: "supplements", area: "Gestão e atalhos", description: "Relatórios, central dissolvida, atalhos Alt e configurações administrativas.", legacyHref: "/suplementos/painel", companyHref: "/company/gestao" },
  { key: "fitness-home", operation: "fitness", area: "Fitness - ponto de partida", description: "A auditoria do Fitness abre quando Suplementos ficar totalmente em OK.", legacyHref: "/fitness", companyHref: "/company/produtos?operacao=Fitness" },
];

export default async function CompanyMigrationMapPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("migration_audit_checks").select("check_key,state,notes").in("check_key", auditRows.map((row) => row.key));
  if (error) throw error;
  const count = (state: Step["state"]) => allSteps.filter((step) => step.state === state).length;
  return <div className="company-map-page company-migration-board">
    <header><span>COMPANY · CONTROLE DA MIGRAÇÃO</span><h1>O que já foi feito, o que testar e o que falta</h1><p>Cada linha aponta a tela, o estado real e a condição para aposentar o ERP antigo.</p></header>
    <section className="migration-scoreboard" aria-label="Resumo da migração"><article><CheckCircle2/><strong>{count("done")}</strong><span>concluídos</span></article><article><ListChecks/><strong>{count("test")}</strong><span>para testar</span></article><article><Clock3/><strong>{count("doing")}</strong><span>em execução</span></article><article><CircleDot/><strong>{count("todo")}</strong><span>pendentes</span></article></section>
    <nav className="migration-jump" aria-label="Blocos da migração">{blocks.map((block, index) => <a key={block.title} href={`#bloco-${index + 1}`}>{index + 1}</a>)}</nav>
    <MigrationAuditBoard rows={auditRows} saved={(data ?? []) as Array<{ check_key: string; state: "pending" | "reviewing" | "approved" | "issue"; notes: string | null }>} />
    <section className="migration-blocks">{blocks.map((block, index) => <article className="migration-block" id={`bloco-${index + 1}`} key={block.title}><header><span>BLOCO {index + 1}</span><h2>{block.title}</h2><p>{block.scope}</p></header><div>{block.steps.map((step) => { const content = <><i className={`migration-state ${step.state}`}>{labels[step.state]}</i><span><strong>{step.label}</strong><small>{step.detail}</small></span>{step.href ? <ExternalLink size={16}/> : null}</>; return step.href ? <Link key={step.label} href={step.href}>{content}</Link> : <div key={step.label}>{content}</div>; })}</div></article>)}</section>
    <section className="company-dna"><div><span>REGRA DE SAÍDA</span><h2>Uma tela antiga só some quando a substituta estiver completa</h2></div><p>Função migrada, dados iguais, teste real aprovado, endereço corrigido e nenhum acesso necessário registrado no ERP antigo.</p></section>
  </div>;
}
