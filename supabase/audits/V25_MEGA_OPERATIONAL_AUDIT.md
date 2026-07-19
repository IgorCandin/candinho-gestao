# V25 · Mega Operacional — Auditoria

## Escopo

Esta versão une quatro necessidades operacionais:

1. Fitness — consignação / prova de peças.
2. Fitness — orçamento, PDF e catálogo.
3. Suplementos — pós-venda consolidado por cliente e janela de compras.
4. Suplementos — Nexus IA para gerar mensagem de pós-venda com contexto real.

## Fitness · Consignação / prova

Estruturas criadas:

- `fitness_consignments`
- `fitness_consignment_items`
- `fitness_consignments_overview`
- `fitness_consignment_items_overview`

Fluxo:

`Gerar consignação / prova`
→ peças ficam fisicamente no estoque, mas deixam de estar disponíveis
→ cliente experimenta
→ `Acerto da prova`
→ operador informa quantas peças a cliente ficou
→ o restante é automaticamente considerado devolvido
→ as peças escolhidas viram uma venda Fitness
→ o movimento de estoque é registrado apenas para as peças vendidas

As peças em prova passam a compor `consigned_quantity`.

A disponibilidade Fitness passa a ser:

`físico - reservado - em prova`

Foram endurecidos os fluxos:

- venda normal não pode usar peça em prova;
- ajuste de estoque não pode reduzir o físico abaixo de reservado + em prova;
- conversão de conjunto não pode consumir peça em prova.

## Fitness · Orçamentos e PDFs

Estruturas:

- `fitness_quotes`
- `fitness_quote_items`
- `fitness_quotes_overview`
- `fitness_quote_items_overview`

Fluxo:

`Novo orçamento`
→ itens por produto / tamanho / cor
→ validade e desconto
→ PDF
→ converter em venda

O orçamento não reserva estoque.
A disponibilidade é validada quando a proposta é convertida em venda.

Correção adicional:

A venda Fitness ganhou `discount_amount`.

Ao converter uma proposta com desconto:

- o desconto é preservado;
- `total_amount` usa o valor líquido;
- `total_profit` também considera o desconto.

PDFs:

- PDF individual do orçamento;
- catálogo automático;
- catálogo com variações selecionadas;
- opção de incluir itens a caminho.

## Pós-venda consolidado

Estruturas:

- `post_sale_batches`
- `post_sale_batch_sales`
- `post_sale_batch_overview`
- `post_sale_batch_summary`

Cada venda continua mantendo seu pós-venda original para rastreabilidade.

A Agenda, porém, passa a trabalhar com um acompanhamento consolidado.

Regra:

- a primeira data de pós-venda vira `anchor_due_on`;
- vendas do mesmo cliente cujo pós-venda fique até 14 dias da âncora entram no mesmo acompanhamento;
- a data exibida (`due_on`) pode ir até a última data daquele grupo;
- a âncora não se move, impedindo agrupamento infinito.

Validação realizada em produção:

- 43 vendas com pós-venda aberto;
- 43 vendas continuam vinculadas individualmente;
- 34 acompanhamentos planejados;
- 34 linhas de pós-venda na Agenda;
- maior lote atual: 5 compras.

Exemplos observados após a regra de âncora:

- Wesley: 3 compras próximas em um acompanhamento;
- Francyelle: compras mais distantes foram separadas em lotes diferentes.

## Agenda

`operational_calendar_events` passa a usar os batches para `sale_post_sale`.

O `source_type` continua `sale_post_sale` para compatibilidade.

O `source_id` novo é o ID do batch.

Ações atualizadas:

- reagendar;
- adicionar observação;
- concluir;
- cancelar.

Ao concluir um batch:

- o batch é concluído;
- as vendas vinculadas recebem `post_sale_status='completed'`;
- é criada uma única interação de pós-venda para o cliente.

Há fallback para IDs legados baseados diretamente em venda.

## Nexus IA

Edge Function:

`post-sale-nexus-suggest`

Estado validado:

- ACTIVE;
- `verify_jwt=true`;
- requer usuário autenticado;
- exige `can_write()`.

Contexto usado automaticamente:

- compras reunidas no acompanhamento atual;
- produtos dessas compras;
- histórico recente de vendas;
- leads recentes;
- interações anteriores;
- observações do cliente;
- sensibilidade à cafeína;
- ansiedade / insônia;
- produtos a evitar;
- preferências de abordagem;
- tags e contexto de CRM.

Regras do prompt:

- mensagem humana e curta;
- linguagem natural no estilo de atendimento do Igor;
- não inventar fatos;
- não fazer promessa ou diagnóstico médico;
- respeitar restrições registradas;
- não forçar cross-sell;
- evitar emoji de coração, especialmente para mulheres.

A resposta salva:

- mensagem pronta;
- resumo interno;
- próxima ação sugerida;
- alertas;
- tom usado;
- modelo e horário.

O teste ponta a ponta da chamada pelo navegador depende do frontend V25 publicado
e de uma sessão de usuário válida. O deploy da Edge Function foi validado como ACTIVE,
mas não foi feita uma chamada autenticada real nesta sessão.

## Segurança

As novas tabelas de Fitness e Pós-venda:

- permitem SELECT direto para usuários autorizados;
- não permitem INSERT direto para `authenticated`;
- não permitem UPDATE direto para `authenticated`;
- não permitem DELETE direto para `authenticated`.

As principais mutações usam RPCs `SECURITY DEFINER`.

Validação das seis RPCs comerciais novas da Fitness:

- `security_definer = true`;
- `search_path=public`;
- `authenticated EXECUTE = true`;
- `anon EXECUTE = false`.

## Frontend

Novas áreas:

- `/fitness/consignacoes`
- `/fitness/consignacoes/nova`
- `/fitness/consignacoes/[id]`
- `/fitness/orcamentos`
- `/fitness/orcamentos/novo`
- `/fitness/orcamentos/[id]`
- `/fitness/pdfs`
- `/pos-venda`
- `/pos-venda/[id]`

Novas APIs:

- `/api/fitness/orcamentos/[id]/pdf`
- `/api/fitness/catalogo/pdf`

A Home Fitness ganhou atalhos para Consignações, Orçamentos e PDFs.
A Home Suplementos ganhou KPI e atalho para Pós-venda com Nexus.

A tela de Estoque Fitness ganhou a coluna `Em prova`.

O arquivo global `app-shell.tsx` foi preservado nesta versão para reduzir risco de
regressão na navegação principal. As novas áreas são acessíveis pelas Homes e,
no caso do pós-venda, também pelos eventos da Agenda.
