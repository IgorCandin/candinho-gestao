import Link from "next/link";
import { companyMigrationTools } from "@/lib/company-migration-tools";

type Entry = { title: string; href: string; description: string };
export function CompanyDailyHub({ supplements, fitness, bank }: { supplements: boolean; fitness: boolean; bank: boolean }) {
  const tools = companyMigrationTools.filter(tool => tool.operation === "fitness" ? fitness : supplements);
  const inventory = tools.filter(tool => /estoque|convers|movimenta|lotes|sabor/i.test(tool.href));
  const otherTools = tools.filter(tool => !inventory.includes(tool));
  const areas: Array<{ title: string; entries: Entry[] }> = [
    { title: "Vender e concluir", entries: [
      ...(supplements ? [{ title: "Nova venda Suplementos", href: "/company/vendas/nova/suplementos", description: "Cliente, produtos, recebimento e entrega" }] : []),
      ...(fitness ? [{ title: "Nova venda Fitness", href: "/company/vendas/nova/fitness", description: "Cliente, tamanho, cor e estoque" }, { title: "Provas e consignações", href: "/company/fitness/consignacoes", description: "Peças com a cliente, devolução e venda vinculada" }] : []),
      { title: "Recebimentos pendentes", href: "/company/concluir?fila=receive", description: "Receber dentro da fila" },
      { title: "Entregas pendentes", href: "/company/concluir?fila=deliver", description: "Concluir as entregas por venda" },
      { title: "Orçamentos", href: "/company/orcamentos", description: "Propostas, conversão e histórico" },
    ] },
    { title: "Atender e cuidar dos clientes", entries: [
      { title: "Atender hoje", href: "/company/acompanhar", description: "Assuntos vencidos e previstos para hoje" },
      { title: "Pós-vendas", href: "/company/acompanhar?fila=post_sale", description: "Registrar conversa e próximo passo na própria fila" },
      { title: "Retornos combinados", href: "/company/acompanhar?fila=follow_up", description: "Compromissos já combinados com os clientes" },
      { title: "Cadastros", href: "/company/clientes", description: "Consulta de pessoas e histórico" },
      ...(supplements ? [{ title: "Telefones Suplementos", href: "/company/clientes/telefones?operacao=Suplementos", description: "Preencher os contatos na própria lista" }] : []),
      ...(fitness ? [{ title: "Telefones Fitness", href: "/company/clientes/telefones?operacao=Fitness", description: "Preencher os contatos na própria lista" }, { title: "Possibilidades de venda Fitness", href: "/company/fitness/oportunidades", description: "Evidência de tamanho e peças disponíveis" }] : []),
    ] },
    { title: "Estoque e reposição", entries: [
      ...(supplements ? [{ title: "Prioridades de estoque", href: "/company/estoque/atencao", description: "Demanda sem disponível antes da reposição" }] : []),
      { title: "Comprar e receber mercadoria", href: "/company/compras", description: "Sugestões, pedidos, recebimentos e fornecedores" },
      { title: "Produtos e disponibilidade", href: "/company/produtos", description: "Catálogo das operações autorizadas" },
      ...inventory,
    ] },
    ...(bank ? [{ title: "Financeiro", entries: [
      { title: "Planejamento do Bank", href: "/bank/planejamento", description: "Mês, entradas, compromissos e simulação" },
      { title: "Entradas e recebimentos", href: "/bank/entradas", description: "Previsões, correções e valores a receber" },
      { title: "Contas e saldos", href: "/bank/atualizar", description: "Conferir posições reais" },
      { title: "Faturas e cartões", href: "/bank/faturas", description: "Datas, valores e histórico" },
    ] }] : []),
    { title: "Materiais e ferramentas", entries: otherTools },
    { title: "Organização e qualidade", entries: [
      { title: "Agenda e Gestão", href: "/company/gestao", description: "Compromissos, metas e organização" },
      { title: "Escritório", href: "/company/escritorio", description: "Visão visual das filas" },
      { title: "Mapa e conferências", href: "/company/mapa", description: "Pendências, resultados e histórico do que já foi conferido" },
      { title: "Qualidade / Doctor", href: "/company/qualidade", description: "Investigar sinais e relatos sem apagar o histórico" },
    ] },
  ];
  return <section className="company-flow-hub" aria-label="Áreas do dia a dia"><h2>Áreas do dia a dia</h2><p>Abra uma área e escolha a ação. Os menus reúnem as funções pelo trabalho que você precisa fazer.</p><div className="company-flow-groups">{areas.filter(area => area.entries.length).map(area => <details key={area.title}><summary>{area.title}</summary>{area.entries.map(entry => <Link key={entry.href} href={entry.href}><strong>{entry.title}</strong><small>{entry.description}</small></Link>)}</details>)}</div></section>;
}
