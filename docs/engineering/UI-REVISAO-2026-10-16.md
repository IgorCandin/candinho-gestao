# Revisão incremental de interface — 16/10/2026

## Estado e escopo

O planejamento Bank anterior foi publicado pelo PR #26 (main d659965). Esta rodada é separada: não confundir código preparado com publicação ou homologação do usuário.

Skills disponíveis conferidas: Find Skills, Frontend Design, Web Design Guidelines e Webapp Testing; React Best Practices está disponível pelo plugin Vercel. Não é necessário instalar outro sistema de interface para esta rodada.

Direção preservada: tema escuro existente, cores por banco, logos fornecidas, titulares distintos e movimentos discretos. Nenhuma mudança em pagamentos, reservas, entradas, estoque ou dados reais.

## Ajustes desta rodada

- Cabeçalho: Visão geral não fica ativa em todas as subpáginas Bank/Atletas.
- Cartões: setas do teclado movem o foco; Home/End acessam extremos; Enter/Espaço mantêm seleção nativa. Foco não seleciona outra conta automaticamente.
- Foco visível também em links e detalhes de entradas.
- Valores com algarismos alinhados; textos longos quebram sem alargar os cartões.
- Botões de navegação com alvo mínimo de 44 px e espaço inferior respeitando a área segura do telefone.
- Mapa de migração atualizado sem apagar conferências nem aprovar linhas automaticamente.

## Conferência do usuário

1. `/bank/planejamento`: mês atual/próximo; reserva somente no mês correto; previsão ainda “a conferir”.
2. Cartões: arrastar, setas, teclado; titulares Sicoob separados; seleção filtra só a lista, não o resumo.
3. Simulador: valor válido e inválido; nenhuma despesa criada.
4. No iPhone, abrir detalhes, rolar até o fim e fechar. Pagar/adiar apenas se realmente desejar alterar aquela conta; não usar pagamentos fictícios.
5. `/bank/entradas` e `/bank/faturas`: somente a aba correspondente deve ficar destacada.
6. `/company/mapa`: conferir continuidade; Suplementos/Fitness ainda dependem da auditoria existente.

## Limites

Validação automatizada desta rodada: 9 testes Bank passaram; TypeScript sem emissão e ESLint dos três arquivos TSX alterados passaram. Nenhum pagamento real executado. Revisão de código aplicou as diretrizes atuais de Web Interface Guidelines e o checklist React disponível, sem introduzir dependências.

Inspeção de código e testes automatizados não substituem validação visual do novo pacote no navegador e iPhone físico. Não zerar Doctor nem declarar todas as pautas antigas concluídas por causa desta revisão.
