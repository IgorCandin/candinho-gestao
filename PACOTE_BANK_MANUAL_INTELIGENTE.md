# Candinho Bank — Manual Inteligente

Pacote consolidado gerado sobre a versão com Analytics + Speed Insights corrigida.

## Novidades

### Central de Atualização
Rota: `/bank/atualizar`

Uma única tela para atualizar:
- saldo atual das contas e carteiras;
- faturas do mês de todos os cartões;
- regra de cada fatura: valor total já com recorrências ou somente parcelas/compras conhecidas.

Campos vazios na Central de Atualização não apagam dados existentes.

### Faturas mais inteligentes
Cada mês do cartão pode informar se o valor:
- já é o total da fatura e inclui mensalidades recorrentes; ou
- representa apenas parcelas/compras conhecidas, permitindo que a projeção some as mensalidades do cartão por fora.

### Patrimônio Candinho Company
Dashboard da Bank passa a consolidar:
- dinheiro vinculado à Company;
- estoque da Candinho Suplementos a custo e valor potencial de venda;
- estoque da Candinho Fitness a custo e valor potencial de venda;
- valores a receber nas operações;
- dívidas da Company;
- posição operacional estimada;
- posição líquida geral.

Todos os cards levam à origem do dado.

### Revisões recomendadas
O Dashboard alerta automaticamente sobre:
- saldos sem atualização há mais de 7 dias;
- faturas do mês vencidas e ainda abertas;
- cartões sem fatura informada no mês atual;
- possíveis mensalidades duplicadas.

### Fechamento Mensal
Rota: `/bank/fechamento`

Permite registrar uma fotografia mensal com:
- saldo em contas;
- estoque das duas operações;
- valores a receber;
- dívidas;
- posição operacional;
- posição líquida geral;
- entradas e compromissos projetados;
- observações do mês.

Refazer um fechamento do mesmo mês atualiza a fotografia, sem duplicar o registro.

## Banco de dados
Migração principal local:
`supabase/migrations/20260717030000_create_bank_manual_intelligence.sql`

Em produção, a evolução foi aplicada em duas migrações:
- `create_bank_manual_intelligence`
- `fix_bank_recurring_invoice_projection`

## Validação
- npm ci: 0 vulnerabilidades
- ESLint: aprovado
- TypeScript: aprovado
- Next.js: compilação, TypeScript e geração de rotas concluídos
- Rotas novas detectadas: `/bank/atualizar` e `/bank/fechamento`
- Teste de fechamento executado em transação com rollback
- Teste da regra de fatura x recorrências executado em transação com rollback
