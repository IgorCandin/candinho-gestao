# Migração do AppSheet para o Candinho Gestão

## Estratégia

O AppSheet permanece ativo durante a construção. O novo sistema será alimentado primeiro com uma cópia dos dados. Só depois da reconciliação de estoque ocorrerá a virada.

## Fase 1 — núcleo já criado

- produtos;
- locais de estoque;
- saldos;
- histórico de movimentações;
- vendas e leads;
- clientes;
- login e permissões.

## Fase 2 — importar dados

Exportações mínimas necessárias do Google Sheets:

1. `ESTOQUE`;
2. `MOVIMENTO_GERAL`;
3. `FICHA_CLIENTES`;
4. `LOG_ESTOQUE`;
5. tabela de transferências e ajustes, caso esteja separada.

As imagens não devem ser importadas pelo caminho antigo do AppSheet. Elas serão enviadas ao Supabase Storage e os produtos receberão novas URLs.

## Fase 3 — conferência obrigatória

Para cada produto e local:

```text
saldo do AppSheet = saldo do novo sistema
```

Diferenças serão corrigidas com um movimento de ajuste identificado como “Migração”, nunca alterando o histórico silenciosamente.

## Fase 4 — operação paralela

Durante alguns dias:

- registros novos continuam no AppSheet;
- uma cópia é inserida no novo sistema;
- venda, cancelamento e transferência são testados;
- relatórios são comparados.

## Fase 5 — virada

Quando saldos, vendas abertas, valores a receber e clientes estiverem reconciliados:

- AppSheet vira somente leitura;
- novo sistema passa a ser a fonte principal;
- planilhas antigas ficam arquivadas para auditoria.

## O que não será copiado cegamente

A documentação atual possui muitas tabelas, colunas, views e ações. Elementos duplicados ou provisórios serão consolidados. A regra de negócio será preservada, mas a limitação técnica do AppSheet não será reproduzida.
