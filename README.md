# Candinho Gestão

ERP da Candinho Company para as operações de Suplementos, Fitness, Bank, Central, Marketing e Physique.

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
