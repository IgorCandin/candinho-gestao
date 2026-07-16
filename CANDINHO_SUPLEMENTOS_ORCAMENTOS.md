# Candinho Suplementos — Fluxo de Novo Orçamento

Pacote implementado em 16/07/2026.

## Alterações

- O atalho de produção **Nova venda** passa a se chamar **Novo Orçamento**.
- A rota continua `/vendas/nova` para preservar links e compatibilidade.
- O formulário ganhou **Desconto geral** e **Brinde**.
- Ao salvar, o usuário escolhe entre **Orçamento confirmado** e **Apenas orçando**.

### Orçamento confirmado

- Cria uma venda normal.
- Mantém o fluxo existente de pagamento, entrega, reservas, parceria, agenda e pós-venda.
- Aplica o desconto sobre o total da venda.
- Considera o custo do brinde no lucro.
- Baixa o estoque do brinde imediatamente na confirmação.
- Se a venda for cancelada, o estoque do brinde é estornado.
- Gera PDF do orçamento confirmado.

### Apenas orçando

- Não reserva nem baixa estoque.
- Cria um orçamento persistente e seus itens.
- Cria um lead com status **Cotação**, vinculado ao mesmo cliente.
- Salva todos os produtos e quantidades do orçamento dentro do lead.
- Gera PDF para envio ao cliente.
- O lead oferece a ação **Confirmar orçamento**, que reabre o formulário preenchido e converte o mesmo orçamento em venda sem recadastrar os produtos.

## PDF

O PDF segue a lógica do modelo antigo do AppSheet, com visual modernizado:

- Número do orçamento
- Data e validade
- Cliente e telefone
- Produtos, quantidade, valor unitário e total por item
- Subtotal
- Desconto
- Total final
- Forma e condição de pagamento
- Brinde
- Observações
- Identidade Candinho Suplementos

Endpoint: `/api/orcamentos/[id]/pdf`

## Banco de dados

A migration adiciona:

- `sales_quotes`
- `sales_quote_items`
- campos de desconto e brinde em `sales`
- RPC `create_budget`
- atualização do cálculo de lucro para desconto e custo do brinde
- atualização de `cancel_sale` para estornar brinde

A migration já foi aplicada no Supabase de produção durante o desenvolvimento deste pacote.

## Validação executada

- `npm ci`: concluído, 0 vulnerabilidades reportadas.
- `npm run lint`: aprovado sem erros.
- `npm run build`: compilação e TypeScript aprovados; rota de PDF incluída no build.
- Testes transacionais no Supabase com `ROLLBACK`:
  - orçamento sem estoque: aprovado;
  - orçamento confirmado com desconto e brinde: aprovado;
  - conversão orçamento → venda: aprovado;
  - cancelamento com estorno do brinde: aprovado.

Os testes de banco foram revertidos e não deixaram registros de teste.
