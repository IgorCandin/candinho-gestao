# Candinho Gestão

ERP da Candinho Company para as operações de Suplementos, Fitness, Bank, Central, Marketing e Physique.

## Continuidade do desenvolvimento

- `AGENTS.md` — instruções obrigatórias para agentes e futuras tarefas
- `docs/engineering/CONTEXT.md` — arquitetura e decisões atuais
- `docs/engineering/BUSINESS_RULES.md` — regras confirmadas e hipóteses a validar
- `docs/engineering/OBSERVATIONS.md` — correções e padrões recorrentes
- `docs/engineering/WORK_QUEUE.md` — fila técnica única e ordem de execução
- `docs/engineering/SECURITY_AUDIT_2026-09-29.md` — auditoria mais recente

## Estrutura do projeto

- `src/` — aplicação Next.js e componentes da interface
- `public/` — imagens e arquivos públicos
- `supabase/` — migrations, funções, auditorias e SQLs históricos
- `scripts/` — utilitários operacionais e de migração
- `docs/` — configuração, documentação atual e arquivo histórico dos pacotes

## Desenvolvimento local

```bash
npm install
npm run dev
```

Use `.env.example` como referência para as variáveis necessárias. Dados reais, chaves e arquivos `.env` não devem ser enviados ao Git. A configuração dos recursos de IA está documentada em `docs/configuracao/IA.md`.

## Validação

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Documentos e instaladores antigos ficam preservados em `docs/arquivo-historico/`. SQLs manuais legados ficam em `supabase/legacy/`; não os execute novamente sem revisar o histórico e o estado atual do banco.
