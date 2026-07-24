# Candinho Company · V27
## Estoque Inteligente + Portal do Parceiro 2.0 + Home limpa

A V27 consolida o controle de sabores implantado na V26 no restante da operação.

### 1. V26 confirmada antes da V27

Commit V26 reconhecido no GitHub:

`da3a6a513e970161a22386e4d3064b7444975055`

Mensagem:

`V26 · Controle de sabores — Estoque, vendas e histórico`

Deployment correspondente verificado como:

- produção
- READY
- alias `candinho.duckdns.org`
- sem aliasError
- sem erros de runtime detectados no período de 30 minutos consultado

---

## 2. Home / seletor de operações

A tela `/dashboard` deixa de repetir KPIs que já existem dentro das operações.

Antes:

- logo da operação
- vendas
- faturamento
- estoque
- outros mini-indicadores

Agora a tela volta a ter uma responsabilidade única:

**escolher a operação**

Mantidos:

- Candinho Company no topo
- Suplementos
- Fitness
- Marketing
- Bank
- Central
- Perfil
- Integrações
- Sair

Os indicadores continuam dentro de cada operação, onde fazem sentido.

---

## 3. Estoque Inteligente

A página `/estoque` agora entende que alguns produtos possuem uma segunda camada operacional: sabores.

O estoque principal continua exibindo:

- físico
- reservado
- disponível
- a caminho

Produtos com sabores ganham indicação visual na tabela:

`3 sabores · Sabores conciliados`

ou, quando necessário:

`3 sabores · Histórico pendente`

`3 sabores · Físico divergente`

`3 sabores · Reservas divergentes`

`3 sabores · A caminho divergente`

---

## 4. Auditoria automática de sabores

Nova página:

`/estoque/sabores`

Ela compara automaticamente:

### Físico

`estoque físico total do produto`

versus

`soma do estoque físico dos sabores`

### Reservas

`reservas totais do produto`

versus

`soma das reservas por sabor`

### A caminho

`unidades totais a caminho`

versus

`soma das unidades a caminho por sabor`

A auditoria nunca corrige valores automaticamente.

Ela apenas sinaliza.

Isso é proposital: uma divergência de estoque precisa ser entendida antes de qualquer alteração.

---

## 5. Estados de integridade

A view `product_flavor_integrity_overview` classifica os produtos em:

- `healthy`
- `history_pending`
- `no_active_flavors`
- `physical_mismatch`
- `reserved_mismatch`
- `incoming_mismatch`

`history_pending` não significa que o estoque está errado.

Significa apenas que existem vendas antigas aguardando classificação histórica de sabor.

---

## 6. Estoque principal + sabores

O novo painel de sabores na tela Estoque mostra:

- produtos que usam sabores
- quantidade de sabores ativos
- produtos inconsistentes
- vendas históricas ainda sem sabor

Quando há problema, o produto aparece na lista de atenção.

Quando é apenas histórico antigo pendente, o link leva direto para:

`/produtos/sabores/historico?produto=<id>`

---

## 7. Portal do Parceiro 2.0

O portal do parceiro agora é consciente de sabores.

Antes o parceiro poderia ver:

`Pré-treino T · 2`

Agora, quando o produto usa sabores, ele vê:

`Pré-treino T · Maçã Verde · 1`

`Pré-treino T · Ice · 1`

Produtos sem sabores continuam aparecendo normalmente.

O total de unidades do ponto continua correto.

---

## 8. Vendas no Portal do Parceiro

As últimas vendas agora exibem o sabor quando houver.

Venda nova:

`Pré-treino T · Ice`

Venda histórica já classificada:

`Pré-treino T · Maçã Verde ×1, Ice ×1`

A V27 reutiliza a classificação histórica criada na V26.

---

## 9. Backend do Portal

Foram adicionadas:

- `partner_portal_get_stock_v2()`
- `partner_portal_get_sales_v2(date,date)`

A função:

- `partner_portal_dashboard(date,date)`

passou a usar as versões V2.

Assim o frontend não precisa fazer cálculos de estoque ou inferir sabor.

O banco entrega a informação já filtrada para o parceiro autenticado.

---

## 10. Segurança

Validação direta após a migration:

### `inventory_workspace_snapshot`

- SECURITY DEFINER: true
- search_path=public
- authenticated EXECUTE: true
- anon EXECUTE: false

### `partner_portal_dashboard`

- SECURITY DEFINER: true
- search_path=public
- authenticated EXECUTE: true
- anon EXECUTE: false

### `partner_portal_get_stock_v2`

- SECURITY DEFINER: true
- search_path=public
- authenticated EXECUTE: true
- anon EXECUTE: false

### `partner_portal_get_sales_v2`

- SECURITY DEFINER: true
- search_path=public
- authenticated EXECUTE: true
- anon EXECUTE: false

---

## 11. Compatibilidade

No momento da implantação da V27:

- produtos com sabores ativos: 0
- sabores ativos: 0
- histórico pendente de sabor: 0

Portanto a V27 não alterou visualmente nenhum produto atual por conta própria.

Quando o primeiro produto for ativado para sabores, as novas áreas começam a exibir os dados automaticamente.

---

## 12. Meta

Nenhuma alteração foi feita em:

- `central-meta-send`
- `central-meta-webhook`

A frente de Meta continua isolada.

---

## 13. Arquivos principais do pacote

- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/estoque/page.tsx`
- `src/app/(app)/estoque/sabores/page.tsx`
- `src/components/inventory-table.tsx`
- `src/app/(app)/parceiro/page.tsx`
- `supabase/migrations/20260720010000_v27_flavor_integrity_and_partner_portal_v2.sql`

---

## Commit sugerido

`V27 · Estoque inteligente, parceiro com sabores e home limpa`


---

## Validação final do pacote

Antes do ZIP:

- arquivos TS/TSX principais do V27 verificados com TypeScript em modo isolado;
- nenhum erro de sintaxe foi encontrado;
- os únicos diagnósticos do `tsc` isolado foram imports não resolvidos, esperados porque a checagem foi executada fora da árvore completa do projeto;
- migration V27 aplicada diretamente no Supabase com sucesso;
- funções novas/revisadas conferidas quanto a SECURITY DEFINER, search_path e grants;
- nenhum produto foi ativado automaticamente para sabores;
- Meta não foi alterada.

O build completo do Next.js será confirmado pelo deployment da Vercel depois do commit.
