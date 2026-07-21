# V38 · Homologação comercial final e integridade

## Base de produção

Commit usado como base:

`c610eea73c51d2c9c27c194c23a8e6d6ee2ddc1c`

`V38 · Pacotão máximo — corrige orçamento confirmado e pagina históricos operacionais`

Estado observado na Vercel após o commit:

`READY`

Runtime do deploy consultado:

- erros: 0 encontrados;
- fatais: 0 encontrados.

## Homologação transacional

Todos os testes abaixo foram executados dentro de transações com `ROLLBACK`.

Nenhum orçamento, venda ou movimento de teste permaneceu em produção.

### Fluxo principal — 6/6

1. `Apenas orçando`
   - orçamento salvo como `quoted`;
   - lead criado;
   - sem confirmação indevida.

2. Editar o mesmo orçamento e confirmar
   - edição do orçamento existente: OK;
   - bug `quote_id is ambiguous`: corrigido;
   - orçamento passou para `confirmed`;
   - venda criada.

3. Parceria + reserva + brinde
   - parceiro preservado;
   - reserva criada;
   - brinde baixado imediatamente;
   - estoque do brinde: 2 → 1 dentro do teste.

4. Pagamento
   - `payment_status = received`;
   - 1 lançamento em `sale_payment_entries`.

5. Entrega
   - `delivery_status = delivered`;
   - `stock_deducted = true`;
   - venda finalizada após pagamento + entrega;
   - estoque do produto: 39 → 38 dentro do teste.

6. Pós-venda
   - lote de pós-venda criado;
   - conclusão operacional: OK;
   - status do lote: `completed`.

### Cancelamentos — 2/2

7. Cancelar antes da entrega
   - venda cancelada;
   - reservas ativas: 0;
   - reserva liberada: 1;
   - brinde restaurado: 2 → 2.

8. Cancelar depois da entrega
   - venda cancelada;
   - produto restaurado: 39 → 39;
   - brinde restaurado: 2 → 2.

Resultado consolidado:

**8/8 testes aprovados.**

## Auditoria de integridade atual

Snapshot após a homologação:

- status: `healthy`;
- inconsistências críticas: 0;
- atenção: 0.

### Zero inconsistências em

- vendas ativas sem itens;
- orçamento confirmado sem venda;
- orçamento `quoted` com venda;
- venda cancelada com reserva ativa;
- entregue sem baixa de estoque;
- finalizada sem pagamento ou entrega;
- estoque Suplementos negativo;
- estoque por sabor negativo;
- reservado maior que físico;
- estoque Fitness negativo;
- divergência no total;
- divergência no custo;
- divergência no lucro;
- divergência entre orçamento e venda;
- recebimento novo sem lançamento;
- erro no Google Calendar;
- sincronização Calendar travada;
- venda com parceiro inativo;
- pós-venda planejado sem venda;
- pós-venda concluído ainda aberto.

## Histórico financeiro legado

Foram encontrados 270 recebimentos históricos sem linha em
`sale_payment_entries`.

Eles são anteriores ao início do controle novo por lançamentos.

O registro mais recente desse grupo é anterior ao corte do sistema novo.
Por isso eles são exibidos apenas como informação e não contam como erro
de integridade.

## Governança

O feed de governança possui atualmente 501 eventos.

Foi implementada paginação:

- 30 eventos por página;
- 17 páginas no estado atual.

Também foi corrigido o excesso de auditoria da integração:

Antes, qualquer `UPDATE` de `central_integrations` gerava evento, inclusive
atualizações internas de sincronização sem alteração de status/conta/erro.

Agora só gera auditoria quando muda algo relevante:

- provider;
- operation_scope;
- account_external_id;
- account_name;
- status;
- last_error.

O histórico antigo não foi apagado.

## Central de mensagens

Volume atual auditado:

- 429 mensagens no total;
- maior conversa: 133 mensagens;
- conversas acima do limite atual de 200: 0.

Conclusão:

não há necessidade imediata de alterar o carregamento da conversa.
A paginação de mensagens pode ser implementada quando uma conversa real
se aproximar de 200 mensagens, evitando complexidade antecipada.

## Entregas deste pacote

- RPC `erp_commercial_integrity_snapshot()`;
- página `/central/executivo/integridade`;
- link entre Saúde de escala e Integridade comercial;
- paginação server-side do histórico de Governança;
- proteção contra spam futuro de auditoria de integrações;
- documentação da homologação 8/8.

## Regra mantida

Nenhum CSS consolidado foi substituído.

Nenhuma tela aprovada foi redesenhada.
