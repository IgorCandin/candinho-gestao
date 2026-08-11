# Cards para Trello

## 🔴 BUG 01 — Duplo clique em pagamento de notinha pode gerar erro 500

**Área:** Candinho Bank → Empréstimos e Notinhas  
**Prioridade:** Crítica  
**Status no pacote:** Correção incluída  

**Esperado:** pagamento concluído uma vez; retries não duplicam nem derrubam a página.  
**Encontrado:** primeira requisição quitava; segunda requisição em internet lenta encontrava a dívida já paga e retornava erro.  

## 🟠 BUG 02 — PDF de produtos ignora promoção ativa

**Área:** Produtos → Exportar PDF  
**Prioridade:** Alta  
**Status no pacote:** Correção incluída  

**Esperado:** preço do PDF deve ser o mesmo preço comercial vigente na vitrine.  
**Encontrado:** PDF usava `sale_price` mesmo quando havia promoção ativa.  

## 🟠 UX — Quitados separados das notinhas em aberto

**Área:** Candinho Bank → Empréstimos e Notinhas  
**Status no pacote:** Incluído junto ao BUG 01  

Ao quitar, o item desce para a seção `Quitados`, evitando novo toque em `Pagar`.

## 🟠 MELHORIA — Radar de recebimentos na tela Hoje

**Área:** Hoje  
**Status:** Planejado, não implementado neste pacote  

Card de valores pendentes + calendário/agenda de pagamentos.
