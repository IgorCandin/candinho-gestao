# Fila técnica única

Atualizada em 29/09/2026. Esta fila acompanha infraestrutura e qualidade; demandas funcionais continuam exigindo confirmação com o roteiro operacional mais recente.

## Concluído nesta etapa

- [x] Criar `AGENTS.md` como entrada única para futuros agentes.
- [x] Documentar arquitetura, comandos e decisões atuais.
- [x] Separar regras confirmadas, regras parciais e hipóteses comerciais.
- [x] Criar processo leve de observações e correções recorrentes.
- [x] Auditar arquivos rastreados por credenciais aparentes.
- [x] Atualizar Next.js, Sharp e PostCSS por alertas de segurança.
- [x] Regenerar o lockfile npm e obter auditoria com zero vulnerabilidades.
- [x] Adicionar Dependabot semanal.

## Próxima etapa recomendada

1. Conferir no GitHub Secret Scanning, Push Protection e Dependabot.
2. Inspecionar o Supabase de produção em modo somente leitura: migrations aplicadas, advisors, RLS, grants, views, funções privilegiadas e buckets.
3. Corrigir achados confirmados do banco em migrations pequenas com pré e pós-teste.
4. Resolver o lint por lotes, começando pelos erros que podem afetar execução; não misturar com redesenho de UX.
5. Importar para esta fila somente as demandas funcionais ainda reproduzíveis do roteiro operacional mais recente.
6. Retomar o pacote funcional da Company, testando cada rota em desktop e mobile antes de marcar como publicado.

## Decisões sobre ferramentas externas

- Claude-Mem: não instalar agora; documentação versionada é mais simples e auditável.
- `claude-code-setup`: aproveitar apenas ideias de preparação e validação, já incorporadas ao `AGENTS.md`.
- Task-observer: adaptado como `OBSERVATIONS.md`, sem serviço permanente.
- OmniRoute: adiado até existir necessidade real de múltiplos provedores no Nexus.
- GitGuardian: não conectar antes de verificar as proteções nativas do GitHub e os acessos solicitados.
