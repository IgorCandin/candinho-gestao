# V45.54 — Agendamento de Rotas

Pacote incremental preparado sobre o `main` atual de `IgorCandin/candinho-gestao`.

**Base validada:** `0b5b7f31ec4dec0a3ea77c579e783ecddc34349e`

## O que entra

- Agendamento de rota por **data + cidade**.
- Aba **Rotas** dentro do Comercial (`/vendas/rotas`).
- Fila temporária própria, separada da Fila Comercial.
- Preparação idempotente dos clientes ativos do CRM cuja cidade bate com a rota.
- Preparação automática ao abrir a aba na **véspera ou no dia** da visita.
- Ações por cliente:
  - **Avisado**: registra contato real no CRM usando `register_customer_interaction`.
  - **Pular**.
  - **Voltar pendente** sem apagar o histórico do contato já realizado.
- Layout responsivo/mobile-first da fila de rota.
- Fechamento dos 4 sinais históricos ativos do UX Doctor por fingerprint.
  - Não há silenciamento: `nexus_record_ux_health_signal_v1` já reabre automaticamente o mesmo fingerprint se houver nova ocorrência.
- Identidade da nova rota no título da aba e versão visual `45.54.0`.

## Data combinada de pagamento do orçamento

Não foi criada coluna nova. O `main` já possui `sales_quotes.payment_due_on`, a revisão de orçamento já carrega esse valor e o formulário já o salva novamente.

Assim, no V45.54 o comportamento é preservado: abra um orçamento salvo para revisão e altere **Data combinada**. Evitamos duplicar informação financeira.

## Arquivos

### Novos

- `src/app/(app)/vendas/rotas/page.tsx`
- `src/components/commercial-route-manager.tsx`
- `src/components/commercial-route-manager.module.css`
- `supabase/migrations/20260830133000_v45_54_commercial_route_scheduling.sql`
- `supabase/tests/v45_54_precheck.sql`
- `supabase/tests/v45_54_postcheck.sql`

### Substituir pelos arquivos deste pacote

- `src/components/commercial-nav.tsx`
- `src/components/route-tab-identity.tsx`

## Ordem recomendada

1. Aplicar este ZIP sobre a raiz do repositório atual.
2. Rodar `supabase/tests/v45_54_precheck.sql`.
3. Revisar e aplicar a migration `20260830133000_v45_54_commercial_route_scheduling.sql`.
4. Rodar `supabase/tests/v45_54_postcheck.sql`.
5. Rodar o build do app.
6. Testar `/vendas/rotas` em desktop e mobile.
7. Agendar uma rota de teste e validar:
   - clientes da cidade;
   - ausência de duplicação ao recarregar;
   - Avisado -> histórico do CRM;
   - Pular;
   - Voltar pendente;
   - Fila Comercial inalterada.

## Observação importante

A execução anterior em `/mnt/data` não estava disponível no runtime atual. Este pacote foi **reconstruído sobre o `main` atual e conferido contra a estrutura real do Supabase**, sem aplicar mudanças em produção durante a geração do ZIP.
