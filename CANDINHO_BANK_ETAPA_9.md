# Candinho Bank — Etapa 9

Implementação visual inicial da Candinho Bank sobre o projeto atual.

## O que entrou

- Candinho Bank saiu do estado "Em breve" no seletor de operações para usuários com `can_access_bank`.
- Permissões de frontend atualizadas com `canAccessBank` e `canWriteBank`.
- Proteção da rota `/bank` no proxy.
- Tema verde próprio da Candinho Bank no AppShell.
- Menu próprio da Bank:
  - Visão geral
  - Cobranças
  - Faturas
  - Empréstimos e Notinhas
  - Planos e Mensalidades
  - Contas e Carteiras
  - Visão Anual
- Dashboard conectado aos dados reais do Supabase:
  - saldo total
  - entradas previstas
  - compromissos do mês
  - saldo/falta após compromissos
  - próximas cobranças
  - saldos por conta
  - projeção dos próximos meses
- Telas de consulta inicial para todos os módulos acima.

## Observação

O backend da Bank já foi criado diretamente no projeto Supabase utilizado pelo sistema. Esta etapa concentra a integração visual do Next.js com essas estruturas.

O arquivo enviado originalmente não continha `node_modules`, então a validação local foi feita por transpile/sintaxe dos arquivos TypeScript/TSX alterados. O build completo deve rodar normalmente no fluxo do projeto após instalar as dependências (`npm install`/`npm ci`) ou no deploy da Vercel.
