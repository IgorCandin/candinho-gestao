# Candinho Bank — Etapa 10

Implementado o fluxo **Atualizar saldo do dia** em `/bank/contas`.

## O que foi adicionado
- Botão `Atualizar saldo` na tela de Contas e Carteiras.
- O link do Dashboard `/bank/contas?acao=atualizar-saldo` agora abre um formulário funcional.
- Formulário em lote com todas as contas ativas e seus saldos atuais pré-preenchidos.
- Seleção da data do saldo.
- Server Action `saveBankBalances` com validação de sessão e permissão `can_write_bank`.
- Salvamento em `bank_balance_snapshots` usando `upsert` por `account_id + balance_date`.
- Reenvio na mesma data atualiza o snapshot do dia sem criar duplicidade.
- Revalidação automática do Dashboard e de Contas após salvar.
- Mensagem visual de confirmação.

## Arquivos principais
- `src/app/(app)/bank/contas/actions.ts`
- `src/app/(app)/bank/contas/page.tsx`
- `src/app/styles.css`
