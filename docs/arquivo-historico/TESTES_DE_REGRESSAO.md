# Testes rápidos depois do commit

## 1. Notinha — pagamento normal

- abrir uma notinha em aberto;
- tocar em `Pagar`;
- confirmar;
- conferir mensagem de sucesso;
- conferir que o item sumiu de **Em aberto** e apareceu em **Quitados**;
- conferir que não existe botão `Pagar` no item quitado.

## 2. Notinha — internet lenta / toque repetido

- em ambiente seguro de teste, registrar um pagamento;
- durante o envio, confirmar que o botão mostra `Registrando...` e fica desabilitado;
- após concluir, não deve existir possibilidade de segundo pagamento pela tela;
- um eventual retry da mesma requisição não deve criar outro registro nem retornar o erro antigo de dívida indisponível.

## 3. Pagamento parcial

- usar uma dívida de valor maior que a parcela;
- pagar somente parte;
- conferir que continua em **Em aberto**;
- saldo restante deve diminuir;
- botão `Pagar` continua disponível.

## 4. PDF — produto sem promoção

- selecionar um produto sem promoção;
- gerar PDF;
- conferir preço normal e, quando aplicável, preço a prazo;
- não deve aparecer selo de promoção.

## 5. PDF — produto em promoção

- selecionar produto com promoção ativa;
- gerar PDF;
- conferir:
  - `PROMOCAO`;
  - preço anterior riscado;
  - preço promocional correto;
  - nome da campanha;
  - validade/estoque.

## 6. PDF — promoção futura

- usar produto com promoção agendada, ainda não ativa;
- PDF deve continuar usando o preço normal.

## 7. PDF completo

- gerar o catálogo completo;
- conferir um produto promocional e um produto normal na mesma geração;
- conferir que nenhum card quebra a geração por caracteres especiais;
- conferir imagens e paginação.
