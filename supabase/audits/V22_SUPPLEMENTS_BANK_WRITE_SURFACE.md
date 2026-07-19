# V22 · Auditoria de superfície de escrita — Suplementos e Bank

## Suplementos

A V22 aplicou o princípio de leitura direta + mutação por RPC nas tabelas
críticas de Suplementos.

A busca de código por `.insert(`, `.update(`, `.delete(` e `.upsert(` não
encontrou gravações diretas nas tabelas críticas endurecidas.

A exceção preservada foi `dashboard_priority_preferences`, usada para as
preferências pessoais de ignorar/remover prioridades do dashboard.

### Tabelas endurecidas

- customers
- customer_interactions
- products
- locations
- sales
- sale_items
- sales_quotes
- sales_quote_items
- product_combos
- product_combo_items
- stock_balances
- inventory_movements
- inventory_reconciliation_reviews
- operational_tasks

Após a migration, as 14 tabelas auditadas ficaram com:

- SELECT = true
- INSERT = false
- UPDATE = false
- DELETE = false

As principais RPCs de clientes, produtos, vendas, orçamentos, estoque,
reconciliação, CRM e tarefas continuam SECURITY DEFINER, owner postgres e
executáveis por authenticated.

## Candinho Bank

O Bank ainda não recebeu a mesma trava porque vários Server Actions atuais
gravam diretamente nas tabelas.

Escritas diretas confirmadas:

- bank_accounts: INSERT
- bank_balance_snapshots: UPSERT
- bank_cards: INSERT
- bank_card_invoices: UPSERT e DELETE
- bank_debts: INSERT
- bank_charges: INSERT
- bank_subscriptions: INSERT e UPDATE
- bank_income_sources: INSERT e UPDATE
- bank_receivables: INSERT
- bank_month_commitment_resolutions: UPSERT

Algumas operações posteriores já usam RPCs, como pagamento de dívida,
adiamento, marcar cobrança paga e receber conta a receber.

### Próxima etapa do Bank

1. criar RPCs SECURITY DEFINER para as gravações diretas;
2. alterar os Server Actions para chamar essas RPCs;
3. publicar e validar o frontend;
4. somente depois revogar INSERT/UPDATE/DELETE direto das tabelas Bank.

## Deploy V21

O commit V21 foi encontrado no GitHub e o deployment correspondente está READY
na Vercel. A consulta de runtime dos últimos 30 minutos não encontrou erros.
