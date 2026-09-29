# Regras de negócio verificadas

Atualizado em 29/09/2026. Esta lista não substitui o schema nem as migrations.

## Confirmadas no código versionado

### Lead e venda

- `sales.record_type` distingue `lead` e `sale`.
- Leads começam pendentes e sem pagamento/entrega aplicáveis.
- Vendas começam ativas, a receber e a entregar, salvo fluxo que já confirme pagamento ou entrega.
- Vendas canceladas não entram nos totais comerciais normais.

Fontes principais: `supabase/migrations/202607130001_initial_schema.sql` e `20260818022348_enforce_sale_and_financial_integrity.sql`.

### Situação e conclusão

- Situações gerais disponíveis: `pending`, `active`, `finalized` e `cancelled`.
- Uma venda cancelada não pode ser recebida nem entregue.
- O fluxo pode manter pagamento e entrega independentes; a venda só finaliza quando as condições aplicáveis estiverem concluídas.

Fonte principal: `supabase/migrations/20260714185338_create_sales_reservations_and_partnerships.sql`.

### Estoque

- Itens de venda são registrados separadamente em `sale_items`.
- A baixa depende do fluxo de venda/entrega e do indicador `stock_deducted`; não deve ser reproduzida apenas pela interface.
- Cancelamentos e estornos precisam respeitar o histórico de movimentos para não duplicar devoluções.

### Combos de Suplementos

- Combos são cadastrados em `product_combos` e seus componentes em `product_combo_items`, com quantidade por produto.
- A existência do cadastro de componentes está confirmada. Antes de mudar a baixa de um combo, validar a RPC atualmente usada pela criação/entrega da venda e testar o efeito nos componentes.

Fonte principal: `supabase/migrations/20260716190000_create_product_combo_templates.sql`.

## Parcialmente confirmadas; validar antes de alterar

- Pedido de fornecedor “aguardando” versus “comprado”: há fluxo e estados versionados, mas a regra efetiva deve ser conferida na view/RPC mais recente e nos dados atuais antes de mudar prioridade ou cobertura.
- Origem obrigatória: diversas operações registram origem/local, mas a obrigatoriedade varia conforme operação e versão do fluxo. Não aplicar uma regra global sem conferir a RPC específica.
- Reserva e posição na fila de mercadoria a caminho: validar dados atuais e ordem das reservas antes de prometer disponibilidade em uma nova venda.

## Hipóteses comerciais — não automatizar ainda

- Pós-venda pode responder melhor que recompra estimada apenas pelo tempo de uso.
- Oportunidades médias podem responder melhor que algumas oportunidades altas.

Essas hipóteses exigem comparação com dados históricos, definição de métrica e período. Até lá, não devem alterar automaticamente pontuação ou ordem da fila comercial.

