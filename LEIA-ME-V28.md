# Candinho Company · V28
## Planejador Inteligente de Compras e Reposição

A V28 adiciona uma camada de decisão de compras para a Candinho Suplementos.

Ela não cria pedidos automaticamente e não substitui a análise do Igor.

A função é responder:

- O que está perto de faltar?
- Quanto tempo o estoque atual ainda cobre?
- O que já está reservado?
- O que já está a caminho?
- Existem vendas aguardando estoque?
- Quanto comprar para atravessar o prazo do fornecedor?
- Quanto investir?
- Qual fornecedor concentra a reposição?
- Falta quanto para o pedido mínimo?
- Falta quanto para atingir frete grátis?

---

## 1. V27 confirmada antes da V28

Commit V27 localizado no GitHub:

`a3f2da7e1a315617322d996f9f072202b97b524b`

Mensagem:

`V27 · Estoque inteligente, parceiro com sabores e home limpa`

Deployment correspondente verificado como:

- produção
- READY

Também foi consultada a janela de runtime dos últimos 30 minutos:

- nenhum erro encontrado

---

## 2. Nova área

Nova rota:

`/pedidos-fornecedor/planejamento`

Também foi adicionado acesso em:

- Suplementos → Planejar compras
- Pedidos de fornecedor → Planejar compras

---

## 3. Giro de vendas

O planejamento usa vendas reais não canceladas dos últimos 90 dias.

São exibidas três janelas:

- 30 dias
- 60 dias
- 90 dias

Para a velocidade diária, o algoritmo usa três faixas sem contar o mesmo período duas vezes:

- últimos 30 dias: peso 60%
- dias 31 a 60: peso 25%
- dias 61 a 90: peso 15%

Assim a operação recente pesa mais, mas uma venda que ocorreu há 45 ou 70 dias não desaparece completamente da análise.

---

## 4. Estoque considerado

A reposição considera apenas locais com:

`counts_for_replenishment = true`

Isso evita usar qualquer ponto físico indiscriminadamente para decidir compras.

No cálculo entram:

- estoque físico
- quantidade reservada
- estoque disponível
- quantidade já a caminho
- vendas que ainda aguardam estoque

---

## 5. Cobertura

Quando existe giro recente:

`Cobertura estimada = estoque disponível / demanda diária ponderada`

Exemplo:

- disponível: 3
- demanda estimada: 0,10 unidade/dia

Cobertura:

`30 dias`

O sistema também estima uma data aproximada de ruptura.

Isso é projeção operacional, não promessa.

---

## 6. Prazo do fornecedor

Cada fornecedor agora pode ter:

- prazo médio de entrega
- cobertura alvo após a chegada
- pedido mínimo
- valor para frete grátis
- condição de pagamento
- observação de frete/logística

Valores padrão implantados:

- prazo médio: 7 dias
- cobertura alvo: 30 dias
- pedido mínimo: R$ 0
- frete grátis: R$ 0

Nenhum fornecedor recebeu valores comerciais inventados.

No momento da implantação:

- fornecedores ativos: 10
- fornecedores com configuração personalizada automática: 0

Os valores reais devem ser preenchidos conforme cada fornecedor.

---

## 7. Quantidade sugerida

O alvo de estoque usa o maior valor entre:

1. estoque ideal cadastrado no produto;
2. demanda prevista durante:
   - prazo do fornecedor
   - cobertura alvo

Depois o sistema desconta:

- estoque disponível
- itens já a caminho

E soma:

- vendas aguardando estoque

Fórmula conceitual:

`Sugestão = Alvo + Falta para vendas - Disponível - A caminho`

Nunca fica negativa.

---

## 8. Prioridades

### Crítico

Quando:

- existe venda aguardando estoque; ou
- há giro e não existe unidade disponível.

### Urgente

Quando a cobertura é menor ou igual ao prazo médio do fornecedor.

### Atenção

Quando a cobertura já entrou na faixa de:

`prazo do fornecedor + 15 dias`

### Monitorar

Produto sem giro recente, mas abaixo da meta mínima cadastrada.

### Cobertura ok

Não existe risco imediato.

Um produto pode estar com cobertura ok e ainda ter uma sugestão pequena de compra para atingir a cobertura alvo.

A interface deixa isso explícito.

---

## 9. Planejamento por fornecedor

A tela agrupa as condições comerciais por fornecedor.

Exibe:

- produtos sugeridos
- unidades sugeridas
- valor estimado da compra
- prazo
- cobertura alvo
- distância do pedido mínimo
- distância da faixa de frete grátis
- condição de pagamento
- observação logística

As configurações podem ser editadas diretamente no planejador.

A escrita é feita por RPC protegida:

`update_supplier_planning_settings`

---

## 10. Produtos com sabores

A V28 não inventa a distribuição de compra por sabor.

Para produto com sabores:

- calcula a necessidade total do produto;
- mostra o aviso `Distribuir compra por sabor`;
- a distribuição continua sendo feita explicitamente no pedido de fornecedor.

Isso evita o sistema decidir sozinho quantas unidades devem ser:

- Ice
- Maçã Verde
- Morango
- Chocolate
- etc.

---

## 11. Combos

Combos virtuais não entram no planejador de compras.

Foi criada uma exclusão explícita usando:

`product_combos.legacy_product_id`

Validação em produção:

- combos virtuais encontrados no planejador: 0

A compra deve ocorrer sobre os produtos físicos que compõem a operação, não sobre o cadastro virtual do combo.

---

## 12. Situação encontrada na implantação

Na fotografia do banco durante a implantação da V28, o motor calculou:

- 26 produtos com alguma compra sugerida
- 40 unidades sugeridas
- investimento estimado: R$ 1.516,33
- lucro potencial bruto estimado: R$ 1.154,67
- produtos sugeridos sem fornecedor padrão: 0

Distribuição de prioridade encontrada:

- Crítico: 16 produtos
- Atenção: 2 produtos
- Monitorar: 1 produto
- Cobertura ok: 49 produtos

Esses números mudam automaticamente conforme:

- novas vendas
- recebimentos
- reservas
- cancelamentos
- transferências
- pedidos de fornecedor
- configurações de prazo/cobertura

Eles não representam um pedido aprovado.

---

## 13. Segurança

RPC:

`purchase_planning_snapshot()`

Validada com:

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false

RPC:

`update_supplier_planning_settings(...)`

Validada com:

- SECURITY DEFINER = true
- search_path = public
- authenticated EXECUTE = true
- anon EXECUTE = false
- mutação exige `can_write()`

A view:

`purchase_planning_overview`

usa:

`security_invoker=true`

---

## 14. Meta

Nenhuma alteração foi feita em:

- `central-meta-send`
- `central-meta-webhook`

A frente da Meta continua isolada.

---

## 15. Arquivos principais

- `src/app/(app)/pedidos-fornecedor/page.tsx`
- `src/app/(app)/pedidos-fornecedor/planejamento/page.tsx`
- `src/components/purchase-planner.tsx`
- `src/app/(app)/suplementos/page.tsx`
- `supabase/migrations/20260720020000_v28_purchase_planning_intelligence.sql`

---

## Commit sugerido

`V28 · Planejamento inteligente de compras e reposição`
