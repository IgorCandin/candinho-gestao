# Candinho Gestão — Hotfixes identificados no teste mobile

Pacote preparado em 26/07/2026 para ser extraído **na raiz do repositório `candinho-gestao`**, mantendo a estrutura de pastas.

## O que corrige

### BUG 01 — Segundo clique em pagamento de notinha podia gerar erro 500

Cenário reproduzido:

1. usuário toca em **Registrar pagamento**;
2. internet fica lenta;
3. a primeira requisição conclui e quita a dívida;
4. usuário toca novamente;
5. a segunda requisição encontra a dívida já paga e o backend antigo lançava erro.

Correções deste pacote:

- `bank_pay_debt_installment` passa a ser idempotente quando a dívida já está quitada;
- dívida cancelada continua bloqueada;
- o botão de pagamento fica desabilitado enquanto a requisição está pendente;
- texto muda para **Registrando...**;
- a tela `Empréstimos e Notinhas` passa a separar:
  - **Em aberto**;
  - **Quitados**;
  - **Cancelados** (quando existirem);
- item quitado não oferece mais `Pagar` nem `Adiar`.

> Observação: o hotfix SQL de idempotência já foi aplicado diretamente no Supabase de produção durante a investigação. A migration está neste ZIP para o repositório ficar sincronizado com produção.

### BUG 02 — PDF de produtos ignorava promoção ativa

Cenário:

- produto está com promoção ativa na vitrine;
- ao exportar o catálogo PDF pela área de produtos, aparecia o preço normal.

Causa:

- as rotas de PDF consultavam `sale_price`/`installment_price`, mas não associavam a promoção ativa usada pela vitrine.

Correções deste pacote:

- os dois PDFs de produtos consultam o mesmo snapshot de promoções usado pela vitrine;
- somente promoção `active`, com estoque, entra no preço efetivo;
- quando houver mais de uma promoção ativa para o mesmo produto, vence o menor preço promocional;
- PDF exibe:
  - selo `PROMOCAO`;
  - preço normal riscado;
  - preço promocional em destaque;
  - nome da campanha;
  - percentual de desconto quando disponível;
  - validade quando disponível;
  - aviso de estoque.
- promoções agendadas não alteram o preço antes da hora.

Rotas incluídas:

- `src/app/api/catalogo/selecionados/route.ts`
- `src/app/api/catalogo/produtos/route.ts`

## Arquivos do pacote

- `src/app/(app)/bank/emprestimos/page.tsx`
- `src/components/bank-payment-submit-button.tsx`
- `src/lib/catalog-active-promotions.ts`
- `src/app/api/catalogo/selecionados/route.ts`
- `src/app/api/catalogo/produtos/route.ts`
- `supabase/migrations/20260726233000_bank_payment_idempotency.sql`
- `TESTES_DE_REGRESSAO.md`
- `PENDENCIAS_UX.md`

## Aplicação

1. Faça backup/commit do estado atual se houver alterações locais.
2. Extraia este ZIP na raiz de `candinho-gestao`, aceitando substituir os arquivos existentes.
3. Rode o build/lint do projeto.
4. Commit sugerido:

`fix: protege pagamento duplicado e aplica promoções nos PDFs`

## Importante

O pacote foi montado sobre a estrutura atual observada no branch `main` durante o teste de 26/07/2026. Se houver commits novos alterando exatamente esses arquivos antes de aplicar o ZIP, revise o diff antes de substituir.
