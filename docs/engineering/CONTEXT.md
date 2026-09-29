# Contexto durável do ERP Candinho

Atualizado em 29/09/2026.

## Visão geral

O projeto é um ERP em Next.js App Router com Supabase para autenticação, banco, storage, RPCs e Edge Functions. As áreas principais são Company, Suplementos, Fitness, Bank, Central, Marketing e Physique.

## Mapa técnico

- `src/app/`: páginas, Server Actions e rotas HTTP.
- `src/components/`: componentes e fluxos interativos.
- `src/lib/`: acesso a dados, contexto operacional e clientes Supabase.
- `src/lib/supabase/`: clientes de navegador, servidor e renovação/proteção de sessão.
- `supabase/migrations/`: histórico versionado do banco.
- `supabase/functions/`: Edge Functions.
- `supabase/tests/`: verificações SQL existentes.
- `docs/arquivo-historico/`: memória histórica; não representa necessariamente o estado atual.
- `supabase/legacy/`: SQL legado; não executar sem confronto com o banco atual.

## Desenvolvimento

```bash
npm install
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

Variáveis esperadas estão em `.env.example`. Chaves reais ficam fora do Git. O frontend usa somente URL e chave publicável do Supabase; `SUPABASE_SECRET_KEY` é exclusiva do servidor e de scripts administrativos.

## Autenticação e acesso

- `src/proxy.ts` aciona `src/lib/supabase/proxy.ts` para renovar a sessão e proteger áreas internas.
- A identidade é validada com `supabase.auth.getUser()`.
- Permissões operacionais vêm de `get_my_access_v2`; fallbacks por e-mail existem no proxy e precisam permanecer restritos aos responsáveis definidos em `src/lib/access.ts`.
- Rotas públicas da Vitrine (`/catalogo`) não passam pela proteção interna e devem aceitar apenas operações deliberadamente públicas e limitadas.
- Uma rota HTTP não deve depender somente da navegação protegida: mutações validam usuário/permissão novamente e o banco mantém RLS/RPCs defensivas.

## Decisões vigentes

- A Company é a camada operacional consolidada. Não redirecionar um fluxo novo da Company para telas antigas de Suplementos/Fitness sem decisão explícita.
- Conversas anteriores não comprovam publicação. Validar código, build, banco e produção separadamente.
- `docs/engineering/` contém documentação atual; pacotes numerados antigos permanecem apenas como histórico.
- Claude-Mem, OmniRoute e GitGuardian não estão instalados ou conectados. Reavaliar somente diante de caso real e após análise de privacidade/permissões.

## Limites desta documentação

Este arquivo descreve o repositório. Estado de migrations aplicadas, variáveis da hospedagem, políticas efetivas do projeto Supabase e proteções do GitHub exigem consulta aos respectivos serviços.

