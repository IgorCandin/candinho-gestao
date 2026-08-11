# Auditoria operacional do ERP · V45.21
Gerada em 11/08/2026 antes da aplicação da V45.21.

## Resumo
A auditoria não encontrou corrupção ampla de estoque ou catálogo de Suplementos.
Os principais pontos são de **completude**, **memória de custo**, cadastros CRM
e alguns placeholders do Bank.

## Suplementos · Produtos
- 70 produtos ativos.
- 0 sem foto principal.
- 0 sem miniatura.
- 0 sem marca aplicável.
- 0 sem categoria.
- 0 sem custo cadastrado.
- 0 sem preço de venda.
- 0 sem fornecedor padrão.
- 0 grupos de nomes duplicados.
- 0 grupos de SKU duplicados.
- 10 produtos com controle por sabor.
- 0 divergências de integridade de sabor.
- 0 itens históricos de sabor pendentes.
- 69/70 estavam sem `last_purchase_cost`.
- 52 produtos possuem histórico real de compras; 51 desses podem ser
  recuperados automaticamente pela V45.21.
- Após o backfill, os produtos que ainda ficarem sem último custo são os que
  realmente não possuem pedido histórico utilizável. Nenhum valor será inventado.
- 70/70 produtos estão com `nutrition_status = pending`.
  Isso não quebra a operação, mas mostra que o módulo nutricional ainda não foi
  revisado/concluído.

## Estoque
- 0 linhas com estoque negativo.
- 34 combinações produto/local com saldo positivo.
- 316 combinações produto/local com saldo zero.
  Zeros não são erro por si só: a visão inclui combinações de locais sem saldo.
- A camada de sabores estava conciliada no momento da auditoria.

## Fitness
- 65 variações ativas.
- 0 sem tamanho.
- 0 sem cor.
- 0 sem custo.
- 0 sem preço de venda.
- 0 sem fornecedor padrão.
- 2 variações sem imagem própria:
  - Jaqueta Corta Vento Impermeável - Masculino · M · Preto
  - Jaqueta Proteção UV - Feminino · G · Preto
- O cadastro de descrição dos produtos Fitness está majoritariamente vazio
  (88 registros na auditoria anterior). Não impede venda/estoque, mas é uma
  pendência se o catálogo interno/público passar a usar descrição.

## CRM
- 185 clientes cadastrados.
- 56 sem telefone.
- 0 sem nome.
- 1 grupo de telefone duplicado.
Esses dados merecem uma limpeza posterior porque telefone é importante para
pós-venda/WhatsApp, mas não devem ser preenchidos por suposição.

## Fornecedores
- 10 fornecedores ativos.
- 10/10 sem pedido mínimo configurado.
- 10/10 sem limite de frete grátis configurado.
Isso explica por que a antiga tela mostrava vários “Não configurado”.
Na V45.21 fornecedor deixa de ser o centro do planejamento; esses campos passam
a ser contexto opcional no histórico.

## Bank
- 10 faturas planejadas com valor R$ 0,00 foram encontradas.
- 0 cobranças abertas com saldo R$ 0,00.
A V45.21 **não apaga** essas faturas, porque podem representar placeholders de
meses futuros. Apenas impede que elas entrem no “Agora” do Nexus.

## Nexus / Qualidade
- Antes da V45.21, page views eram usados como “uso” no Aprendizado.
  Isso inflava Company e homes de operação.
- A V45.21 muda “uso” para interação significativa:
  `navigation_click` e `action_click` feitos **a partir** da tela.
- Exemplo: abrir Produtos 10 vezes, mas agir dentro dele em 2 ocasiões,
  passa a contar aproximadamente 2 usos úteis, não 10 entradas.
- Gateways automáticos como `/dashboard` e `/suplementos` deixam de competir
  no ranking de uso.

## Próxima limpeza sugerida depois da V45.21
1. Revisar os 56 clientes sem telefone e o grupo duplicado.
2. Adicionar imagens às 2 variações Fitness.
3. Decidir se o módulo nutricional realmente será usado; se sim, revisar os
   70 produtos pendentes.
4. Configurar pedido mínimo/frete grátis somente para fornecedores onde isso
   realmente ajuda (não preencher só para “completar campo”).
5. Revisar se as 10 faturas Bank de R$ 0,00 devem continuar como placeholders.
