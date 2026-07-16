# Candinho Bank — Etapa 13

## Empréstimos e Notinhas operacionais

Nesta etapa a rota `/bank/emprestimos` passou a permitir:

- cadastrar uma nova dívida como Empréstimo ou Notinha;
- informar credor, valor total, parcela planejada, datas, origem e observações;
- registrar pagamento pelo botão `Paguei`;
- informar valor pago, data, conta usada e observação;
- descontar automaticamente o pagamento do saldo restante;
- avançar o próximo vencimento em um mês após o pagamento;
- quitar automaticamente a dívida quando o saldo chegar a zero;
- adiar o pagamento em um mês sem juros e sem aumentar o saldo da dívida;
- visualizar progresso pago x valor original.

## Segurança

As RPCs `bank_pay_debt_installment` e `bank_postpone_debt_payment` foram reforçadas no Supabase para exigir `can_write_bank()`, mantendo usuários somente leitura impossibilitados de alterar dados financeiros.
