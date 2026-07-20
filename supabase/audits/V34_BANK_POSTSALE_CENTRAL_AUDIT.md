# V34 · Auditoria técnica
## Bank mensal + Nexus pós-venda + Central

Data: 20/07/2026

---

## 1. Base de produção

Base utilizada:

V33

Commit:

`d6cf57fa1ab0b2d71e1ee74062dc1458ed791499`

A V34 não altera Marketing nem Edge Functions Meta.

---

## 2. Bank · problema de vencimento mensal

Problema:

alguns compromissos pertencem ao mês, mas não possuem dia real de vencimento.

Exemplos auditados:

- Psicóloga da Giulia · R$ 400/mês
- Notinha na loja da Graça · R$ 100/mês

Antes:

o modelo exigia/derivava dia e podia transformar uma pendência mensal em atraso artificial.

Solução:

coluna `due_mode`:

- `fixed_day`
- `month_only`

Aplicada em:

- `bank_subscriptions`
- `bank_debts`

---

## 3. Ajustes de dados confirmados

### Psicóloga da Giulia

- amount: 400
- billing_day: NULL
- due_mode: month_only

### Notinha na loja da Graça

- original_amount: 900
- monthly_amount: 100
- julho confirmado pelo usuário como pago
- total_paid: 100
- next_due_date: 2026-08-01
- due_day: NULL
- due_mode: month_only

`2026-08-01` é referência interna do mês e não vencimento exibido.

### CNPJ

- valor mensal: 85
- julho marcado como resolvido/pago

### Água

- valor mensal: 70
- julho marcado como resolvido/pago antecipadamente

### Empréstimo Ian

Não alterado automaticamente.

Motivo:

o usuário informou existência de pagamentos históricos, mas não informou o acumulado exato.

### Sicoob CNPJ

Não alterado automaticamente pelo mesmo motivo.

---

## 4. Correção do botão Paguei

Antes a Home usava `bank_month_commitment_resolutions` genericamente para ocultar itens.

Isso era insuficiente para:

- dívidas;
- faturas;
- cobranças.

V34 despacha para a fonte correta:

| tipo | ação |
|---|---|
| charge | bank_mark_charge_paid |
| invoice | bank_mark_invoice_paid |
| debt | bank_pay_debt_installment |
| subscription | bank_mark_commitment_paid |

---

## 5. Faturas

Nova RPC:

`bank_mark_invoice_paid(uuid,date)`

Proteção:

- `can_write_bank()`
- SECURITY DEFINER
- search_path=public
- anon revogado

Tela agrupada por `reference_month`.

Faturas pagas:

- aparecem no histórico;
- não aparecem na Atualização Rápida;
- ficam desabilitadas no formulário de atualização;
- não são enviadas no payload de upsert.

---

## 6. Ajuste histórico de dívida

Nova RPC:

`bank_adjust_debt_history`

Uso esperado:

uma conciliação inicial.

Campos:

- total pago real;
- próximo dia real;
- ou próximo mês de referência;
- observação.

Guardrails:

- não aceita total negativo;
- não aceita total maior que dívida original;
- não permite reduzir `total_paid`;
- exige próxima referência se ainda existe saldo;
- registra `adjustment` em `bank_debt_payments`.

---

## 7. Pós-venda Nexus · diagnóstico

Edge antiga:

`post-sale-nexus-suggest` v1

Erros observados no backend:

- `permission denied for table customers`
- `column customer_interactions.contact_on does not exist`

Impacto:

o frontend recebia apenas:

`Edge Functions returned a non-2xx status code`

O erro acontecia durante carregamento de contexto.

---

## 8. Pós-venda Nexus · correção

Edge implantada:

`post-sale-nexus-suggest` v2

Status:

ACTIVE

verify_jwt:

true

Novas RPCs internas:

- `post_sale_nexus_context`
- `post_sale_nexus_save_result`

Acesso:

- service_role: execute
- authenticated: revogado
- anon: revogado

A Edge mantém autenticação do usuário e valida `can_write()` antes de usar o caminho interno.

Contexto real:

- batch
- cliente
- compras do acompanhamento
- compras recentes
- leads recentes
- interações recentes

Campo corrigido:

`occurred_at`

---

## 9. Central Clientes

Nova RPC:

`central_customer_directory_snapshot(text)`

Fonte de verdade:

### Suplementos

- `sales`
- `customers`

Somente:

- record_type = sale
- não canceladas

### Fitness

- `fitness_sales`
- `fitness_customers`

Somente:

- não canceladas

Identidade:

telefone normalizado quando possui pelo menos 8 dígitos.

Sem telefone confiável:

ID da operação.

Nunca mescla somente por nome.

Consulta-base validada:

- 170 identidades compradoras na fotografia atual
- 1 identidade presente nas duas operações

Esses números são dinâmicos.

---

## 10. Correção encontrada durante validação

Primeira versão da RPC Central Clientes referenciava:

`fitness_sales.customer_city`

A coluna real é:

`fitness_sales.city`

A falha foi detectada antes da entrega do ZIP.

Foi aplicada migration corretiva:

`20260720143329_v34_fix_central_customer_directory.sql`

Também foi removido uso de agregação `max(uuid)` em favor de `array_agg(...)[1]`, mantendo compatibilidade segura.

---

## 11. Central Mídia

Nova Edge:

`central-media-delete`

Status:

ACTIVE

Version:

1

verify_jwt:

true

Fluxo:

- autenticação;
- perfil ativo;
- validação de escopo;
- remoção do Storage;
- remoção do asset.

FKs auditadas:

- `central_media_tags`: cascade
- `marketing_projects.source_media_asset_id`: set null

Nenhum projeto de Marketing é apagado.

---

## 12. Central Agenda/Pendências

Somente UX.

Nenhum dado fictício inserido.

Estado vazio da agenda:

`Agenda livre neste filtro`

Estado vazio das pendências:

`Tudo em dia por aqui`

---

## 13. Central Inbox / Integrações / Ativação

Inbox já pausada.

V34 também tira da navegação ativa:

- `/central/integracoes`
- `/central/ativacao`

As rotas redirecionam para `/central`.

Não houve mudança em:

- central-meta-send
- central-meta-webhook

---

## 14. Security Advisor

Durante a revisão, o Advisor identificou `bank_debts_overview` como view SECURITY DEFINER.

A causa era a recriação da view sem `security_invoker=true`.

Foi corrigido imediatamente:

`20260720143039_v34_fix_bank_debts_overview_security_invoker.sql`

Após nova checagem, o alerta específico desapareceu.

Avisos antigos/independentes permanecem:

- `resolve_login_email(text)` anon SECURITY DEFINER, exceção histórica de login;
- trigger functions internas sinalizadas pelo advisor;
- RLS sem policy em tabelas internas/arquivo.

Nenhum desses foi alterado cegamente pela V34.

---

## 15. Validação TypeScript

Arquivos TS/TSX do pacote:

21

Verificação:

TypeScript `transpileModule`

Erros sintáticos:

0

Isso não substitui o build completo da Vercel.

O build completo deve ser confirmado após o commit.

---

## 16. Estado de implantação

### Já em Supabase

- migrations V34
- post-sale-nexus-suggest v2
- central-media-delete v1

### Ainda depende de commit

- frontend Next.js
- fontes espelhadas das migrations
- fontes das Edge Functions
- UX Bank
- UX Pós-venda
- UX Central

Portanto não declarar V34 frontend como produção antes do deployment Vercel do commit correspondente.
