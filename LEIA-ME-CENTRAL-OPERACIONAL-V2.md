# Candinho Central · Operacional V2

Este patch deve ser extraído por cima da pasta atual do projeto.

## Incluído
- Dashboard da Central com status de prontidão Meta/OpenAI.
- Cadastro manual de contatos.
- Busca e filtro de contatos por vínculo.
- Página individual de contato em `/central/clientes/[id]`.
- Inbox com busca, filtro por canal/operação/status.
- Ações de marcar lida, pendente, concluir/reabrir e sugerir com Nexus.
- Contexto mais completo do cliente dentro da conversa.
- Nexus com estado explícito de disponibilidade da OpenAI.
- Biblioteca de mídia com resumo e status de classificação por IA.
- Correção de navegação para evitar link inexistente de detalhe Fitness.

## Validação
- ESLint: 0 erros (1 aviso já conhecido sobre `<img>` na biblioteca de mídia).
- Next.js build: compilação e TypeScript concluídos; todas as rotas geradas, incluindo `/central/clientes/[id]`.

Commit sugerido:
`Candinho Central · Operacional V2`
