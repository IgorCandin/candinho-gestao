# Observações de desenvolvimento

Use este arquivo como fila leve de correções, não como lista automática de mudanças.

## Formato

```text
ID:
Data:
Contexto:
Evidência:
Sugestão:
Status: observado | confirmado | adotado | transformado em teste | descartado
Referências:
```

## Observações atuais

### OBS-001 — Não anunciar publicação sem evidência

- Contexto: em conversas anteriores, funcionalidades foram descritas como publicadas sem que o comportamento em produção estivesse confirmado.
- Evidência: relatos posteriores de rota com erro ou função ausente.
- Sugestão: separar sempre “implementado no código”, “build aprovado”, “banco aplicado” e “produção testada”.
- Status: adotado em `AGENTS.md`.

### OBS-002 — Company não deve escapar para módulos antigos

- Contexto: rotas e atalhos criados dentro da Company levaram para Suplementos/Fitness antigos.
- Evidência: relatos recorrentes durante a migração.
- Sugestão: revisar destino de links e registrar exceções deliberadas.
- Status: adotado como regra; cobertura automatizada ainda pendente.

### OBS-003 — Correção visual não pode remover função

- Contexto: simplificações de UX anteriores ocultaram ou removeram capacidades necessárias.
- Evidência: necessidade de recuperar estoque, conclusão de vendas e ações existentes.
- Sugestão: antes de redesenhar, inventariar ações e testar os fluxos essenciais em desktop e mobile.
- Status: adotado como processo; testes de regressão ainda pendentes.

## Revisão

### OBS-004 — Pós-venda permanece após cancelamento

- Data: 03/10/2026.
- Contexto: calendário do ERP e fila de contatos de pós-venda.
- Evidência: consulta em produção confirmou 3 tarefas automáticas de reposição ainda planejadas para vendas canceladas, incluindo Edirlei. O pós-venda agrupado já estava cancelado; a reposição era a origem do contato ativo.
- Sugestão: conferir vínculo do compromisso com a venda e tratamento do cancelamento na geração, atualização e sincronização da agenda. Retirar da fila o contato originado exclusivamente pela venda cancelada, preservando histórico e contatos de outras vendas válidas do cliente.
- Status: corrigido no banco em 03/10/2026; consulta pós-correção confirmou zero tarefas automáticas ativas ligadas a vendas canceladas e tarefa de Edirlei cancelada. Histórico e vínculos preservados. Validação visual pendente.
- Teste esperado: criar venda com pós-venda, cancelar e verificar que o contato deixa a agenda/fila ativa; uma segunda venda válida do cliente deve manter seu contato.


Ao finalizar uma etapa, revisar observações confirmadas e promover as úteis para:

- regra em `AGENTS.md`;
- decisão em `CONTEXT.md`;
- regra verificada em `BUSINESS_RULES.md`;
- teste automatizado ou roteiro de regressão.

