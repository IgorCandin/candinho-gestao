# V38 · Central de Promoções

## Escopo
Nova função transversal da Candinho Central para Suplementos e Fitness.

## Estrutura
- `central_promotions`
- `central_promotion_items`
- `central_promotions_overview`
- `central_promotion_items_overview`
- `central_promotion_suggestions`

## Sugestões Suplementos
Usa `inventory_intelligence_overview` e considera:
- giro 30/90 dias;
- estoque parado 90d;
- giro lento 60d;
- excesso;
- validade em até 60 dias;
- estoque disponível;
- curva comercial A/B/C/Z.

Regras:
- Z: nunca entra automaticamente.
- C zerado: não entra.
- A saudável com alto giro: preço protegido, sugestão de chamariz/cross-sell.
- vencidos e quarentena: excluídos das sugestões promocionais.

## Sugestões Fitness
Considera por variação:
- peça;
- tamanho;
- cor;
- estoque disponível;
- vendas entregues 30/90 dias;
- tempo desde última venda;
- excesso sobre alvo de reposição.

## Margem
O desconto sugerido é limitado pela função para preservar aproximadamente
15% de margem bruta sobre o preço promocional.

## Segurança validada
- authenticated: CRUD nas tabelas via RLS quando possui permissão de gestão.
- anon: sem SELECT nas tabelas.
- authenticated: EXECUTE em `central_promotion_suggestions`.
- anon/public: sem EXECUTE na função de sugestões.

## Migrations aplicadas
- `v38_central_promotions_center`
- `v38_central_promotions_permissions_hardening`
