# Candinho Bank — Etapa 11

Implementação do fluxo **Atualizar Faturas**.

## Entregue
- Botão Atualizar faturas abre o editor real.
- Modo Individualmente.
- Modo Atualizar todas.
- Seleção de cartão.
- Edição dos próximos 12 meses a partir do mês atual.
- Campo vazio = não informado.
- Valor 0 = fatura explicitamente zerada.
- Salvamento por upsert em `bank_card_invoices`.
- Limpeza de valores não informados sem apagar faturas já pagas.
- No modo todas, após salvar avança para o próximo cartão.
- Revalidação de Dashboard, Faturas e Visão Anual.
- Respeita `can_write_bank`.
