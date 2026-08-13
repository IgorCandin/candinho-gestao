# V45.30 — Banco já aplicado

As alterações desta versão foram aplicadas diretamente no Supabase oficial em 12/08/2026.
Não execute SQL manualmente para instalar este pacote.

## Correções de produção

- `sales_history_v2`: SELECT restaurado para `authenticated` e `service_role`.
- A antiga rotina que movia centenas de datas de recompra virou leitura leve.
- Recompras automáticas deixaram de gerar eventos individuais no Google Calendar.
- Triggers da Agenda agora apenas enfileiram sincronizações; o cron faz o despacho em lote.
- O worker passou a reservar no máximo 4 jobs por execução e ignora recompra automática.
- A tempestade antiga de erros de recompra foi encerrada sem criar novas baixas ou alterações comerciais.

## Fila Comercial

Criada `commercial_contact_attempts` e as RPCs:

- `commercial_contact_queue_v1(limit)`
- `commercial_contact_action_v1(source_type, source_id, action, notes)`

Regras principais:

- Meta: 12 contatos por dia.
- `Chamei`: conta para a meta e volta em 2 dias para checar resposta.
- `Pular`: não conta e vai para o fim da fila atual.
- `Não respondeu`: volta depois de 7 dias.
- `Respondeu`: fica 3 dias fora da fila antes de nova avaliação.
- Nova venda do mesmo produto elimina automaticamente a recompra antiga da fila.
- Recompra só entra quando existe estoque disponível.
- Lead com `lead_stock_watches` ativo não entra na fila flexível; permanece no fluxo de estoque/fornecedor.

## Nexus

`nexus_unified_queue_v1` deixa de expor dezenas de tarefas de recompra e passa a devolver um único item `commercial_queue` com o próximo contato e o progresso do dia.

## Parceiros

Criada `archive_partner_v1`.
Ela remove o parceiro da rede ativa, encerra a parceria e desativa acessos do portal, mas preserva vendas, acertos, custos e histórico.
