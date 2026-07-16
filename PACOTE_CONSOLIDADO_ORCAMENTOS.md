# Pacote consolidado — Comercial / Orçamentos / Permissões

Este pacote parte da versão com Novo Orçamento, desconto, brinde, PDF e integração com Leads.

## Incluído nesta rodada

- Central completa de Orçamentos em `/orcamentos`.
- Filtros por situação e busca por cliente, produto ou número.
- Situações: Em orçamento, Vencido, Confirmado, Perdido e Cancelado.
- Tela detalhada de cada orçamento.
- Abertura do PDF pela central.
- Edição e confirmação de orçamento aberto sem redigitar itens.
- Orçamento vencido pode ser revisado e reenviado.
- Marcar orçamento como perdido.
- Cancelar orçamento sem movimentar estoque.
- Reabrir orçamento perdido/cancelado.
- Integração da central com Leads e Vendas.
- Nova aba Orçamentos na navegação comercial.
- Proteção de rota `/orcamentos` pelas permissões da Candinho Suplementos.
- Permissão da Candinho Bank adicionada ao gerenciamento de usuários.
- Backend de permissões atualizado para salvar e listar acesso à Bank.
- Guia simples da Candinho Company para a Giulia incluído no projeto.

## Banco de dados

Migration aplicada diretamente no Supabase de produção:

- `update_budget_status(uuid,text)`.
- `list_user_permissions()` agora retorna `can_access_bank`.
- `update_user_permissions(...)` agora aceita `p_can_access_bank`.

Nenhuma alteração destrutiva foi feita nos dados existentes de vendas, estoque ou clientes.
