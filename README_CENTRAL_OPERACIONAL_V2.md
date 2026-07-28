# Pacotão UX — Central operacional + Estoque

## 1. Agenda da Central realmente unificada
A Central passa a reunir:
- tarefas manuais da Central;
- agenda operacional de Suplementos;
- cobranças, pós-venda e chegadas de fornecedor da Fitness;
- tarefas manuais de Suplementos e Fitness.

Identidade visual:
- Azul = Central
- Dourado = Suplementos
- Rosa = Fitness

Marketing continua no planejamento próprio, para não misturar tudo.

## 2. Prioridades da Central deixa de ser CRM
A tela de Prioridades passa a mostrar somente:
- estoque em atenção;
- tarefas internas atrasadas/urgentes/em atenção;
- problemas de parceiros;
- integrações com problema.

Radar, recompra, leads e rotinas comerciais ficam dentro da operação de Suplementos/Fitness.

A função do banco também foi ajustada para o número da Central não continuar inflado pelo Radar.

## 3. "Confirmar contagem inicial"
Isso era uma validação de migração:
quando um ponto parceiro aparece com saldo 0 e ainda não tem movimentação no fluxo novo,
o sistema não sabe se esse zero é real ou se faltou migrar estoque.

Problema antigo:
se o ponto estava REALMENTE zerado, a pessoa não tinha uma forma clara de confirmar o zero.

Agora:
- a tela explica o que significa;
- se o ponto está com físico 0, aparece "Confirmar ponto zerado";
- isso registra a validação sem criar estoque ou movimentação falsa;
- o alerta some depois da confirmação;
- se existe produto no ponto, continua usando Contagem Física por produto.

## 4. Inteligência de estoque
O "Mapa completo do estoque" deixa de ser uma tabela larga espremida.

Cada produto passa a ocupar duas faixas:
Linha principal: Produto | ABC | Ação
Linha operacional: Estoque | Giro 90d | Última venda | Cobertura | Capital

No mobile, a grade quebra automaticamente sem scroll horizontal.

## Aplicação
Extraia na raiz de `candinho-gestao`, substitua os arquivos e faça:

GitHub Desktop -> Commit -> Push origin

Commit sugerido:
`fix: unifica agenda e limpa prioridades da Central`

## Banco
A migration incluída no ZIP já foi aplicada no Supabase de produção.
Não rode SQL manualmente.
