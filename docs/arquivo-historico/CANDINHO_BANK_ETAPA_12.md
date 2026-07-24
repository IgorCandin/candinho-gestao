# Candinho Bank — Etapa 12

## Cobranças operacionais

Esta etapa transforma a tela de Cobranças em um fluxo funcional ligado ao Supabase.

### Nova cobrança
- Botão `Nova cobrança` abre o formulário de cadastro.
- Campos: nome, valor, vencimento, origem, categoria, descrição e observações.
- Salva em `bank_charges` como cobrança manual pendente.
- Revalida Dashboard, Cobranças e Visão Anual.

### Marcar como pago
- Cada cobrança pendente, parcial ou vencida ganha a ação `Marcar como pago`.
- Abre um painel de confirmação com data do pagamento e conta usada.
- Usa a RPC `bank_mark_charge_paid`.
- Registra a conta de pagamento sem alterar automaticamente o saldo diário, já que o saldo real continua sendo controlado por `Atualizar saldo`.
- Revalida Dashboard, Cobranças e Visão Anual.

### Dashboard
- O atalho `Nova cobrança` agora abre diretamente o formulário de nova cobrança.
