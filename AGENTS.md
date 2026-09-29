# Candinho Company — instruções para agentes

Este arquivo é a entrada obrigatória para qualquer tarefa neste repositório.

## Fonte da verdade

1. Estado atual do código e migrations.
2. Banco e produção, quando houver acesso somente de leitura e autorização.
3. Documentação atual em `docs/engineering/`.
4. Conversas e documentos históricos servem como pistas, nunca como prova de implementação.

Não diga que algo foi publicado, corrigido ou testado sem registrar a evidência correspondente.

## Antes de alterar

- Leia `docs/engineering/CONTEXT.md`, `BUSINESS_RULES.md` e `OBSERVATIONS.md`.
- Preserve mudanças existentes e arquivos não rastreados do usuário.
- Confirme a rota e a operação afetadas: Company, Suplementos, Fitness, Bank, Central, Marketing ou Physique.
- Procure uma implementação atual antes de reutilizar arquivos de `docs/arquivo-historico/` ou `supabase/legacy/`.
- Para segurança, faça primeiro a análise de leitura e separe fatos confirmados de itens que exigem validação externa.

## Regras de execução

- Novos fluxos integrados à Company devem permanecer em `/company`, salvo exigência técnica documentada.
- Não altere regras de venda, estoque, pagamentos ou dados reais apenas para corrigir interface ou documentação.
- Mudanças de banco devem ter migration, revisão de RLS/permissões e teste proporcional ao risco.
- Nunca exponha chaves secretas no navegador, logs, documentação ou resposta ao usuário.
- Não instale memória externa, roteador de modelos ou integração de segurança sem justificar acessos, custo e privacidade.
- Prefira mudanças pequenas, reversíveis e verificáveis.

## Validação mínima

Execute, conforme a mudança:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev
```

Para alterações de banco, complemente com os testes de `supabase/tests/` e validação no ambiente correto. Uma compilação não prova que a migration foi aplicada em produção.

## Registro de correções

Registre correções e padrões em `docs/engineering/OBSERVATIONS.md` com contexto, evidência, sugestão e status. Um comentário isolado não autoriza mudar automaticamente uma regra de negócio. Quando uma observação se repetir ou for confirmada, transforme-a em documentação, teste ou melhoria de fluxo.

