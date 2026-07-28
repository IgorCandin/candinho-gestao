# Leads — editar, excluir e converter corretamente

## Lead
Na tela de detalhe entram:
- **Converter em venda**
- **Editar lead**
- **Excluir lead**

## Converter em venda
O fluxo fica:
1. pega o lead atual;
2. cria ou reaproveita o orçamento ligado a ele;
3. abre a tela existente de **Novo Orçamento** já preenchida;
4. você revisa preço, sabor, pagamento, entrega, brinde etc.;
5. somente quando confirmar a venda o lead vira **Convertido** e sai da lista de Leads.

Se você abandonar antes da confirmação, o lead continua existente.

## Editar lead
Antes de existir orçamento, pode alterar:
- cliente;
- produto;
- sabor;
- status;
- observações.

Se já existe orçamento, a edição do produto no lead é bloqueada e o sistema manda editar pelo orçamento, evitando duas versões diferentes da mesma negociação.

## Excluir lead
Remove definitivamente o lead desde que ele ainda não tenha sido convertido em venda.
Se houver orçamento não confirmado, o orçamento é preservado e perde apenas o vínculo com o lead.

## Orçamento
Além de perdido, cancelar e reabrir, agora existe **Excluir definitivamente**.

Cancelar = mantém histórico e permite reabrir.
Excluir = remove realmente da tela.
Orçamento já convertido em venda fica protegido.

## Banco
A migration deste pacote já foi aplicada no Supabase de produção.
Não rode SQL manualmente.

## Aplicação
Extrair na raiz -> substituir -> GitHub Desktop -> Commit -> Push origin

Commit sugerido:
`feat: permite editar excluir e converter leads e excluir orçamentos`
