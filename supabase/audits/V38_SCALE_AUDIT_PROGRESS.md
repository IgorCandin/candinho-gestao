# V38 · Auditoria geral de escalabilidade — progresso

## ✅ Corrigido neste pacotão

### Segurança
Execução anônima removida de 9 funções/RPCs internas administrativas.

### Banco / performance
Índices adicionados nos relacionamentos prioritários de:
- Promoções;
- Agenda Estratégica;
- consignações Fitness;
- lotes;
- movimentos de lotes;
- trocas/devoluções.

### Vitrine pública
Criada fronteira pública mínima por RPC `public_storefront_snapshot()`.

A RPC:
- não retorna custo;
- não retorna lucro;
- não retorna fornecedor;
- não retorna `brand`;
- não retorna produto restrito;
- não retorna categoria Z;
- retorna apenas estoque disponível;
- conecta as promoções reais cadastradas no ERP.

### Physique
Criada fundação relacional integrada ao ecossistema existente.

## ⚠️ Achados confirmados ainda pendentes

### Vendas
A tela atual carrega o histórico inteiro antes de renderizar.
Próxima evolução recomendada: paginação/consulta server-side.

### Leads
A tela atual carrega todos os leads e agrupa em memória.
Próxima evolução recomendada: mês/página no banco.

### Detalhe do cliente
Funções atuais de histórico podem carregar coleções globais e filtrar por cliente depois.
Próxima evolução: queries específicas por `customer_id`.

### Swipe anterior/próximo
Algumas entidades carregam todos os IDs para descobrir o registro vizinho.
Próxima evolução: cursor/query por ordenação.

### RLS
O advisor ainda aponta algumas policies permissivas duplicadas em tabelas recentes.
Revisar uma a uma antes de consolidar para evitar mudança acidental de permissão.

## Regra arquitetural adotada

> Não criar ilhas dentro do ERP.

Sempre que houver relação real:
- reutilizar entidade existente;
- manter fonte autoritativa;
- criar links entre módulos;
- evitar duplicar cliente/contato/produto;
- integrar ações e históricos quando fizer sentido.
