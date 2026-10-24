# Fitness — navegação entre fichas Company

Cartões técnicos: https://trello.com/c/geFKYykz e https://trello.com/c/Fftoz6V9.

## Lacuna e menor correção

A ficha legada Fitness compõe `EntitySwipeNavigator`, mas a ficha Company não o fazia. O resolvedor existente `getEntitySwipeNavigation` já aceita `fitness_customer` e contexto Company. A página Company agora consulta os mesmos vizinhos e compõe o mesmo navegador, sem copiar ações, regras ou algoritmo de navegação. A consulta somente de leitura ocorre em paralelo com cadastro/histórico e permanece sob o cliente autenticado e permissões existentes.

Histórico, observações, edição, identificadores, vendas e estado vazio permanecem iguais. Setas e gesto lateral navegam para `/company/clientes/fitness/:id`; não se cria cliente, contato, vínculo ou venda. Legado não foi desativado.

## Evidências locais

- Dois testes reproduziram a ausência antes da mudança, depois passaram.
- Terceiro teste executa o componente real de navegação: setas, gesto esquerdo/direito, limites, rejeição de gesto vertical/curto e área interativa/tabela, limpeza dos listeners.
- Suíte Node completa: 215/215, zero falhas.
- ESLint direcionado e `git diff --check`: exit 0.
- TypeScript, build remoto, revisão e QA visual/publicação devem ser registrados no PR/Trello após comprovação; este documento não afirma que ocorreram.

## Próximas pendências, não incluídas

Observações no resolvedor de cadastro Fitness e paridade completa de vínculos ainda exigem investigação separada de persistência/permissões; não são corrigidas por este lote de navegação. Nenhum SQL, migration, RLS ou registro real foi alterado. PR #79 continua DRAFT, sem aplicar sua proposta SQL.
