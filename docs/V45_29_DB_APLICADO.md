# V45.29 — Banco já aplicado

As alterações de banco desta versão foram aplicadas diretamente no Supabase
oficial. Não execute SQL manualmente.

Foram criadas:
- `rebalance_flexible_commercial_contacts_v1(12)`
- âncoras de data para recompra e leads flexíveis
- suporte a `record_type = outflow`
- `reclassify_sale_as_commercial_outflow_v1`
- suporte a correção histórica sem segunda baixa de estoque

A auditoria do banco preserva os vínculos entre a antiga venda e a saída
comercial reclassificada.
