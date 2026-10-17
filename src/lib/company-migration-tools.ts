/** Existing operations, exposed in Company without retiring legacy routes. */
export const companyMigrationTools = [
  {operation:"fitness", title:"Conversões de conjuntos", description:"Converter conjunto em peças avulsas com os movimentos existentes.", href:"/company/fitness/conversoes"},
  {operation:"supplements", title:"Configuração de parceiros", description:"Regras incompletas, investimento e materiais destinados.", href:"/company/parceiros/configuracao"},
  {operation:"supplements", title:"Central integrada", description:"Ferramentas existentes com navegação dentro da Company.", href:"/company/gestao/central"},
  {operation:"supplements", title:"Movimentações de Suplementos", description:"Entradas, saídas, ajustes e estornos com busca e paginação.", href:"/company/estoque/movimentacoes"},
  {operation:"supplements", title:"Reconciliação de estoque", description:"Pendências, contagem e histórico de resoluções existentes.", href:"/company/estoque/reconciliacao"},
  {operation:"fitness", title:"Consignações e provas", description:"Enviar peças, acertar as escolhidas, devolver e cancelar.", href:"/company/fitness/consignacoes"},
  {operation:"fitness", title:"Inteligência de estoque", description:"Curva ABC, giro, capital parado, reposição e provas vencidas.", href:"/company/estoque/fitness/inteligencia"},
  {operation:"fitness", title:"Movimentações", description:"Histórico com busca, filtros e paginação.", href:"/company/fitness/movimentacoes"},
  {operation:"fitness", title:"PDFs e catálogo", description:"Selecionar peças e gerar os materiais existentes.", href:"/company/fitness/pdfs"},
  {operation:"fitness", title:"Nexus Fitness", description:"Diagnóstico, campanhas e cesta de compras existentes.", href:"/company/fitness/nexus"},
  {operation:"fitness", title:"Custos e insumos Fitness", description:"Controle já integrado à Company.", href:"/company/custos-insumos?operacao=fitness"},
  {operation:"supplements", title:"Nexus Suplementos", description:"Prioridades, perguntas e ações com confirmação.", href:"/company/suplementos/nexus"},
  {operation:"supplements", title:"Hábitos do Nexus", description:"Consultar os padrões técnicos de navegação já registrados.", href:"/company/suplementos/nexus/habitos"},
] as const;
