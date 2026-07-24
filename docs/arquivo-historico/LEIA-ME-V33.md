# Candinho Company · V33
## Inteligência de Estoque — Suplementos + Fitness

A V33 cria uma camada executiva de estoque sem substituir:

- Estoque operacional
- Planejador de compras V28
- Lotes/validade/FEFO V29
- Consignações Fitness V25
- Pedidos de fornecedor
- Reconciliação
- Sabores

O objetivo é responder:

> O que preciso fazer com meu estoque hoje?

---

# 1. Base confirmada antes da V33

Último commit encontrado antes da V33:

`dc505809bb3e3ebad1d0105caf5134f5f61bbf09`

Mensagem:

`chore: align V32 migration version`

Deployment correspondente:

- Produção
- READY

A V32 adicionou o Centro de Fornecedores e permaneceu como base para a V33.

---

# 2. Suplementos — nova área

Nova rota:

`/estoque/inteligencia`

Atalho adicionado na Home de Suplementos:

`Inteligência de estoque`

A tela consolida:

- Curva ABC
- Giro de 30/60/90 dias
- Faturamento dos últimos 90 dias
- Última venda real
- Estoque físico
- Reservas
- Disponível
- A caminho
- Cobertura
- Meta de cobertura
- Risco de ruptura
- Estoque parado
- Excesso estimado
- Capital em estoque
- Capital parado
- Lotes vencidos
- Lotes próximos do vencimento
- Quarentena

---

# 3. Curva ABC

A Curva ABC usa faturamento real dos últimos 90 dias.

Regras:

- Classe A: produtos que compõem até 80% do faturamento acumulado
- Classe B: produtos entre 80% e 95%
- Classe C: restante do faturamento
- Classe N: sem faturamento nos últimos 90 dias

Nenhum produto recebe classe A/B/C por suposição.

---

# 4. Estoque parado

Um produto só é classificado como parado há 90+ dias quando:

- possui estoque físico;
- e a última venda ocorreu há pelo menos 90 dias;

ou:

- nunca teve venda;
- e o cadastro do produto já possui pelo menos 90 dias.

Produtos novos não são tratados como estoque parado apenas por ainda não terem venda.

---

# 5. Excesso estimado

A V33 reutiliza a meta operacional da V28.

Excesso base:

`Disponível + A caminho - Estoque alvo`

Mas o produto só vira alerta de excesso quando também existe um sinal de baixa necessidade:

- faturamento zero nos últimos 90 dias;

ou:

- cobertura superior ao maior entre:
  - 2x a cobertura alvo;
  - 60 dias.

Isso evita chamar qualquer pequeno saldo acima da meta de “problema”.

---

# 6. Prioridade de ação — Suplementos

A V33 define uma ação principal por produto.

Ordem:

1. Lote vencido
2. Vence em até 30 dias
3. Ruptura crítica
4. Compra urgente
5. Estoque parado 90+ dias
6. Excesso estimado
7. Programar compra
8. Vence em até 60 dias
9. Giro lento 60+ dias
10. Vence em até 90 dias
11. Sem ação imediata

A tela direciona o usuário para a ferramenta correta:

- Planejador de compras
- Lotes e validades
- Detalhe de estoque

Não duplica esses fluxos.

---

# 7. Estado observado em Suplementos na implantação

Fotografia do banco durante a implantação:

- 68 produtos analisados
- 43 produtos com alguma ação prioritária
- 5 produtos classificados como parados há 90+ dias
- R$ 154,11 de capital em estoque parado há 90+ dias
- 16 produtos com excesso estimado
- R$ 1.025,53 de excesso estimado em custo
- 16 produtos em prioridade crítica de reposição
- 0 urgentes
- 2 em atenção
- 0 unidades vencidas
- 0 unidades vencendo em até 30/90 dias
- R$ 3.285,76 de capital em estoque físico

Curva ABC:

- A: 18 produtos
- B: 13 produtos
- C: 9 produtos
- N / sem faturamento 90d: 28 produtos

Esses números são dinâmicos e mudam com vendas, estoque, pedidos, recebimentos e lotes.

---

# 8. Fitness — nova área

Nova rota:

`/fitness/estoque/inteligencia`

Atalho adicionado na Home Fitness:

`Inteligência de estoque`

A análise é feita no nível de variação:

- produto
- cor
- tamanho

A Curva ABC, porém, é calculada no nível do produto completo.

Isso evita classificar o mesmo modelo como negócios diferentes apenas porque possui P/M/G ou cores distintas.

---

# 9. Inteligência Fitness

A V33 cruza:

- estoque físico
- reservado
- disponível
- a caminho
- peça em prova/consignação
- consignação vencida
- vendas 30/60/90 dias
- faturamento 90 dias
- última venda
- meta mínima
- alvo de reposição
- fornecedor padrão
- capital em estoque
- excesso estimado
- giro lento
- estoque parado

---

# 10. Consignações Fitness

A V33 não substitui a área de consignações.

Ela apenas usa o fluxo existente para destacar:

- peças atualmente em prova;
- peças cujo retorno previsto já venceu.

Quando há consignação atrasada, a ação leva para:

`/fitness/consignacoes`

---

# 11. Estado observado em Fitness na implantação

Fotografia atual:

- 62 variações analisadas
- 25 produtos
- 59 variações com alguma ação calculada
- 26 variações zeradas
- 8 variações em estoque baixo
- 26 variações com excesso estimado
- R$ 685,37 de excesso estimado
- R$ 875,40 de capital em estoque
- 0 peças em consignação no momento da implantação
- 0 consignações atrasadas
- 0 variações classificadas como paradas há 90+ dias

O volume alto de ações reflete a estrutura atual do estoque Fitness:
há muitas variações zeradas e outras com saldo acima da meta.

A V33 mostra esse desequilíbrio em vez de esconder.

---

# 12. Correção adicional encontrada durante a auditoria

Ao validar os últimos 30 minutos de runtime da V32, foi encontrado um erro real no deployment atual:

`column inventory_history.product does not exist`

Rota afetada:

`/parceiros/[id]`

Causa raiz:

`src/lib/partner-legacy-history.ts`

consultava uma coluna antiga/inexistente chamada:

`inventory_history.product`

A tabela atual possui:

`product_id`

com chave estrangeira para:

`products(id)`

A V33 corrige o frontend para buscar:

`product:products(name)`

Assim o histórico legado de parceiros volta a resolver o nome do produto pela relação correta.

Nenhum dado histórico foi alterado.

Também apareceu na janela um erro antigo de permissão da primeira publicação V32 em:

`/fornecedores`

O erro estava associado ao deployment inicial da V32, não ao deployment final `dc505809...`.

---

# 13. Segurança

Views:

- `inventory_intelligence_overview`
- `fitness_inventory_intelligence_overview`

Ambas:

- `security_invoker=true`
- SELECT para authenticated/service_role
- acesso anon revogado

RPCs:

- `inventory_intelligence_snapshot()`
- `fitness_inventory_intelligence_snapshot()`

Validação:

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false

Nenhuma escrita nova foi criada.

A V33 é uma camada analítica.

---

# 14. Meta

Nenhuma alteração foi feita em:

- `central-meta-send`
- `central-meta-webhook`

---

# 15. Arquivos principais

- `src/app/(app)/estoque/inteligencia/page.tsx`
- `src/components/inventory-intelligence-dashboard.tsx`
- `src/app/(app)/fitness/estoque/inteligencia/page.tsx`
- `src/components/fitness-inventory-intelligence-dashboard.tsx`
- `src/app/(app)/suplementos/page.tsx`
- `src/app/(app)/fitness/page.tsx`
- `src/lib/partner-legacy-history.ts`
- `supabase/migrations/20260720124628_v33_inventory_intelligence.sql`
- `supabase/migrations/20260720125559_v33_fitness_inventory_intelligence.sql`

---

# Commit sugerido

`V33 · Inteligência de estoque, Curva ABC e ações prioritárias`
