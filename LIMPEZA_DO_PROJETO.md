# Limpeza segura do projeto

## Pode apagar/recriar sem perder o código-fonte

Estas pastas/arquivos são gerados ou cache e podem ser removidos quando precisar liberar espaço:

- `node_modules/`
- `.next/`
- `.vercel/` (configuração local; a integração remota da Vercel continua existindo)
- `.turbo/`
- `coverage/`
- `tsconfig.tsbuildinfo`
- arquivos `*.log`
- `.DS_Store`

Para reconstruir dependências depois:

```bash
npm install
```

Para rodar localmente:

```bash
npm run dev
```

## Não apague da sua pasta local

- `.git/` — mantém o projeto ligado ao Git/GitHub Desktop e seu histórico.
- `.env`, `.env.local`, `.env.production` — contêm configurações locais/segredos; mantenha localmente e não envie em ZIP.
- `package.json`
- `package-lock.json`
- `src/`
- `public/`
- `supabase/`
- arquivos de configuração do Next/TypeScript/ESLint.

## Documentos `.md` antigos na raiz

Arquivos como `PACOTE_*.md`, `CANDINHO_BANK_ETAPA_*.md`, `MAPEAMENTO_INICIAL.md` e outros documentos históricos não são usados pelo build da aplicação. Eles podem ser movidos para uma pasta de arquivo/histórico para deixar a raiz mais limpa.

Neste pacote eles foram preservados, porque podem conter decisões e histórico úteis. Recomenda-se arquivar antes de excluir definitivamente.
