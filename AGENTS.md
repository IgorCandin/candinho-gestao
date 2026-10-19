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
- Páginas `page.tsx` devem receber somente props de rota aceitas pelo Next.js. Opções internas como `companyMode` pertencem a componentes compartilhados fora de `app/`; entradas Company e legadas compõem esses componentes. Valide também os tipos gerados pelo build, sem ignorar erros ou editar `.next/types`.
- Antecipe ajustes óbvios de acabamento dentro do escopo: o responsável prefere padrões visuais consistentes. Antes de enviar uma prévia, confira enquadramento, margens internas e tamanho óptico de logos/imagens lado a lado; caixas iguais não garantem marcas visualmente iguais. Preserve proporções e identidade, sem exigir que o responsável aponte cada diferença. Isso não autoriza ampliar regras de negócio ou publicar em produção.

## Skills por tarefa

- Use somente as skills necessárias: `systematic-debugging` para bugs, `verification-before-completion` antes de concluir, `ponytail` para a menor solução completa e `code-simplification` apenas em simplificação autorizada. Não abra refatoração geral.
- Skills compartilhadas ficam em `.agents/skills/`; fontes fixadas em `.agents/tooling-lock.json`. Rode `node scripts/verify-agent-setup.cjs`. React, testes visuais e outras skills do cliente são reutilizadas quando disponíveis; veja `docs/setup.md`.
- Não instalar hooks, serviços, modelos, agentes paralelos ou publicar por instrução de skill. Escopo e autorização do responsável prevalecem; descoberta automática depende do cliente/sessão.

## Validação mínima

- Preferência confirmada em 16/10/2026: neste trabalho, publicar melhorias autorizadas após as verificações técnicas e entregar links do site oficial para teste, sem exigir rodada manual de prévia. Isso não autoriza alterações fora do escopo, ignorar falhas de build ou executar mudanças arriscadas em dados/regras sem confirmação. Testes do responsável continuam pendentes até retorno explícito.

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

