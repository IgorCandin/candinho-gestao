# Candinho Bank · Home V13

Atualização focada somente no bloco solicitado para a tela inicial da Bank.

## 1. A receber neste mês
Antes a Home usava `totalExpectedIncome`, que é uma projeção e mistura renda recorrente, recebíveis das operações e outras previsões.

Agora o card considera somente:
- contas a receber da Bank ainda abertas e com vencimento no mês atual;
- vendas da Candinho Suplementos realmente a receber com vencimento no mês atual;
- vendas da Candinho Fitness realmente a receber com vencimento no mês atual.

Rendas futuras e projeções não entram mais no card "A receber neste mês".

## 2. Projeção do mês que vem
Novo bloco com:
- Entrada prevista;
- Saída prevista;
- Diferença projetada.

Aqui a projeção anual continua sendo usada de propósito, porque este bloco é explicitamente uma previsão.

## 3. Atrasados: botão Pago
Os atrasados da Home agora possuem o botão `Pago`.
Ao clicar:
- o compromisso some da fila daquele mês;
- o saldo das contas bancárias NÃO é alterado automaticamente;
- o usuário pode atualizar o saldo real manualmente depois.

Foi criada a tabela `bank_month_commitment_resolutions` para guardar essa resolução mensal sem apagar o histórico original.
A migration já foi aplicada ao banco de produção durante a montagem deste pacote.

## 4. Notinhas
Este pacote não muda o fluxo detalhado de Notinhas porque o sistema já possui abatimento parcial do saldo restante através do pagamento de dívida.
A próxima revisão pode simplificar especificamente a projeção mensal das Notinhas sem mexer nas contas normais.

## Aplicação
Extraia o ZIP na raiz de `candinho-gestao`, substitua os arquivos e faça commit + push.

Commit sugerido:
`Bank Home V13 · Recebíveis reais, projeção mensal e botão Pago`
