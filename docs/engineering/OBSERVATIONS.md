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

Ao finalizar uma etapa, revisar observações confirmadas e promover as úteis para:

- regra em `AGENTS.md`;
- decisão em `CONTEXT.md`;
- regra verificada em `BUSINESS_RULES.md`;
- teste automatizado ou roteiro de regressão.

