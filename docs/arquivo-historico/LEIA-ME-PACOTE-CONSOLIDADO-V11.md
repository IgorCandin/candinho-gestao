# Candinho Company — Pacote Consolidado V11

Pacote de refinamento operacional gerado sobre o estado atual do repositório `IgorCandin/candinho-gestao`.

## Como aplicar

1. Faça backup da pasta atual do projeto, se desejar.
2. Extraia este ZIP sobre a raiz do projeto `candinho-gestao`.
3. Preserve `.git`, `.env` e `.env.local`.
4. Abra o GitHub Desktop e revise os arquivos alterados.
5. Commit sugerido:

`Pacote Consolidado V11 · Bank mensal, UX operacional, Catálogo e Fitness`

6. Faça Push para `main`.
7. Aguarde o deploy da Vercel.
8. A migration incluída em `supabase/migrations/20260718210000_fix_operation_investment_monthly_semantics.sql` deve ser aplicada ao Supabase conforme o fluxo normal do projeto. A interface já usa `monthly_ordered_cost`, portanto o valor visual do investimento mensal fica coerente mesmo antes da migration; a migration corrige também a semântica interna de `monthly_invested`.

---

# 1. Candinho Bank — foco mensal

A Home foi refeita com a regra:

> Cada mês é uma pequena vitória.

A tela inicial deixa de usar o montante da vida financeira como foco principal.

Agora prioriza:

- o que vence hoje;
- atrasados do mês;
- próximos vencimentos até o último dia do mês;
- saldo disponível;
- a pagar até o fim do mês;
- a receber no mês;
- projeção até o fechamento do mês;
- investimento operacional do mês.

Foi criada a leitura mensal unificada em:

`src/lib/bank-home-data.ts`

Ela reúne na Home:

- cobranças;
- faturas de cartão;
- mensalidades diretas;
- parcelas/dívidas mensais;

com tentativa de evitar duplicidade quando uma obrigação já possui cobrança vinculada.

O patrimônio, visão anual e demais análises continuam acessíveis pelas telas detalhadas, sem dominar a porta de entrada.

---

# 2. Valor investido — correção de conceito

Regra oficial:

> Investimento do mês = custo dos pedidos de fornecedor feitos naquele mês.

Não é:

> custo do estoque acumulado.

Também não é:

> recebido no mês + pedidos pendentes.

O componente `OperationInvestmentPanel` agora mostra somente a visão mensal e usa `monthlyOrderedCost`.

A migration corrige a RPC para que:

`monthly_invested = monthly_ordered_cost`

em Suplementos, Fitness e Company.

---

# 3. Home Suplementos — menos duplicidade

Removida a repetição visual de "Pedidos pendentes" nos atalhos quando a mesma informação já aparece no KPI de Pendências.

A Home passa a concentrar:

- Novo orçamento/venda;
- Pendências;
- Possíveis clientes;
- Estoque em atenção;
- Investimento do mês;
- Produtos e catálogo;
- Radar;
- Leads;
- Painel Gerencial.

O cabeçalho global de ações deixa de aparecer na Home da operação, evitando duplicar "Novo orçamento" no topo e no card principal.

---

# 4. Sidebar — botão Sair sempre acessível

A sidebar foi reorganizada em três blocos:

1. Logo fixa.
2. Menu com scroll próprio.
3. Usuário + Sair fixos no rodapé.

O scroll deixa de empurrar o botão Sair para fora da tela.

Também foram ajustados:

- Bank: "Visão geral" → "Este mês".
- slogan do Bank: "Um mês de cada vez."
- Marketing: atalhos para ideias/arquivos e planejamento.

---

# 5. Radar — informações sem corte horizontal

A tabela larga de 7 colunas foi substituída por cards responsivos.

Cada oportunidade mostra:

- prioridade;
- cliente;
- origem;
- oportunidade;
- último produto;
- janela estimada;
- histórico;
- recomendação;
- botão de próxima ação.

Isso elimina a dependência de uma tabela com largura mínima de 1250px.

---

# 6. Gallery — zoom previsível

O grid da Gallery passa a calcular diretamente o tamanho mínimo do card no componente.

O zoom controla tamanho real do card, em vez de depender apenas das classes CSS antigas.

Mantidos:

- Deck / Gallery;
- Completo / Essencial;
- busca;
- filtros;
- ordenação comercial.

---

# 7. Catálogo PDF — novo fluxo

Novo fluxo:

`Gerar catálogo PDF`

→ `Selecionar produtos` OU `PDF automático`

→ `Incluir produtos a caminho?`

Na seleção manual:

- busca por produto;
- múltipla seleção;
- contador de escolhidos;
- PDF somente com os itens marcados.

Novo endpoint:

`/api/catalogo/selecionados`

O endpoint automático antigo continua preservado.

---

# 8. Candinho Fitness — UX aproximada da Suplementos

Home refinada com a mesma lógica estrutural da Suplementos:

- ação principal;
- KPIs;
- investimento mensal;
- atalhos operacionais;
- pedido de fornecedor.

O catálogo da Fitness ganhou:

- busca;
- filtro por categoria;
- filtro por estoque;
- Deck / Gallery;
- ordenação por disponibilidade;
- cards visuais;
- variações;
- estoque disponível;
- estoque a caminho;
- faixa de preço.

A estrutura de tamanho/cor/variante continua preservada.

---

# 9. Parceiros — histórico legado recuperado

Foi adicionada uma leitura do histórico antigo presente em `inventory_history`.

A tela do parceiro pode exibir:

- data;
- tipo de movimentação;
- produto;
- quantidade;
- destino/origem.

Proteções incluídas:

- remove linhas marcadas como `Marco zero teste`;
- agrupa movimentos espelhados pelo `partner_movement_original_id`;
- não presume que um envio foi "brinde" quando o legado não diz isso explicitamente.

Isso permite recuperar, por exemplo, os envios antigos de coqueteleiras para a C.T.S. Pâmella Nunes sem contar o mesmo movimento duas vezes.

---

# 10. Operação Marketing — direção funcional definida

A Home deixa de ser apenas "fundação aguardando definição".

Agora apresenta o fluxo oficial:

1. Ideia / Material.
2. Interpretação.
3. Projeto / Roteiro.
4. Produção.
5. Resultado.

Atalhos:

- Ideias e arquivos;
- Calendário de produção;
- Nexus;
- Candinho Central.

## Importante

Este pacote define e organiza a UX do Marketing.

A automação completa:

> anexar PDF → extrair todo o conteúdo → interpretar → criar automaticamente uma página de projeto/roteiro

ainda exige uma etapa específica de processamento de documentos e não foi fingida neste pacote.

O arquivo original continua sendo preservado pela estrutura de mídia existente.

---

# Arquivos principais alterados

- `src/app/(app)/bank/page.tsx`
- `src/lib/bank-home-data.ts`
- `src/components/operation-investment-panel.tsx`
- `src/app/(app)/suplementos/page.tsx`
- `src/components/app-shell.tsx`
- `src/components/customer-opportunity-radar.tsx`
- `src/components/product-catalog-actions.tsx`
- `src/components/product-catalog-table.tsx`
- `src/app/(app)/produtos/page.tsx`
- `src/app/api/catalogo/selecionados/route.ts`
- `src/app/(app)/fitness/page.tsx`
- `src/app/(app)/fitness/produtos/page.tsx`
- `src/components/fitness-product-catalog.tsx`
- `src/lib/partner-legacy-history.ts`
- `src/app/(app)/parceiros/[id]/page.tsx`
- `src/app/(app)/marketing/page.tsx`
- `supabase/migrations/20260718210000_fix_operation_investment_monthly_semantics.sql`

---

# Checklist depois do deploy

1. Abrir Bank e conferir:
   - vencimentos de hoje;
   - vencimentos restantes de julho;
   - faturas;
   - mensalidades;
   - parcelas.

2. Conferir investimento mensal:
   - Suplementos julho esperado pela base atual: R$ 1.129,21.

3. Abrir Suplementos:
   - confirmar ausência de duplicidade do Novo Orçamento na Home;
   - confirmar ausência do atalho duplicado de Pedidos pendentes.

4. Reduzir a altura da janela:
   - menu deve rolar;
   - botão Sair deve continuar visível.

5. Abrir Radar:
   - confirmar leitura completa sem scroll horizontal obrigatório.

6. Abrir Produtos:
   - testar Gallery nos 5 níveis;
   - gerar PDF automático;
   - gerar PDF selecionando 2 ou 3 produtos;
   - testar com e sem produtos a caminho.

7. Abrir Fitness:
   - testar busca;
   - filtros;
   - Deck / Gallery.

8. Abrir C.T.S. Pâmella Nunes:
   - conferir histórico legado recuperado.

9. Abrir Marketing:
   - conferir nova organização do fluxo.

---

## Observação de validação

O pacote foi montado como overlay de arquivos para revisão/commit.

A auditoria de produção anterior encontrou a Vercel sem clusters de erro de runtime no período consultado. O Supabase apresentou erros históricos de tentativas/migrations anteriores em logs, mas este pacote não altera as integrações Meta/Central nem as Edge Functions relacionadas.
